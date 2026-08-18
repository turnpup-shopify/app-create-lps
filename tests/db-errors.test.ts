import { describe, expect, it } from 'vitest'
import { describeDbError } from '@/lib/db/errors'

/** What postgres.js throws: an Error carrying a SQLSTATE on `code`. */
const pgError = (code: string, message = 'boom') => Object.assign(new Error(message), { code })

/**
 * What actually reaches the route. Drizzle wraps the driver error, so the outer
 * Error carries no code at all and the real one is on `cause`. This is the
 * shape the app sees in production, taken from a real failure.
 */
const wrapped = (code: string, message = 'boom') =>
  Object.assign(new Error('Failed query: select "id" from "outlines"'), {
    query: 'select "id" from "outlines"',
    cause: pgError(code, message),
  })

describe('describeDbError', () => {
  it('names the missing table, which is the usual case on a fresh database', () => {
    const reason = describeDbError(pgError('42P01', 'relation "outlines" does not exist'))
    expect(reason).toContain('outlines table is not in the database')
    expect(reason).toContain('db:push')
  })

  it('reads through the wrapper drizzle puts around the driver error', () => {
    // The outer Error carries no code. Reading only that sent every failure to
    // the generic sentence, which is what a real deployment hit.
    const reason = describeDbError(wrapped('42P01', 'relation "outlines" does not exist'))
    expect(reason).toContain('outlines table is not in the database')
  })

  it('reads a code through the wrapper for the other causes too', () => {
    expect(describeDbError(wrapped('28P01'))).toContain('user or password')
    expect(describeDbError(wrapped('3D000'))).toContain('does not exist')
    expect(describeDbError(wrapped('ECONNREFUSED'))).toContain('refused the connection')
  })

  it('does not loop forever on an error that causes itself', () => {
    const looped: Error & { cause?: unknown } = new Error('round we go')
    looped.cause = looped
    expect(describeDbError(looped)).toContain('Check the database address')
  })

  it('recognises the missing table from the message when there is no code', () => {
    expect(describeDbError(new Error('relation "outlines" does not exist'))).toContain('not in the database')
  })

  it('separates a wrong password from a wrong address', () => {
    expect(describeDbError(pgError('28P01'))).toContain('user or password')
    expect(describeDbError(pgError('28P01'))).not.toContain('Check the database address, then reload')
  })

  it('names a database that does not exist', () => {
    expect(describeDbError(pgError('3D000'))).toContain('does not exist')
  })

  it('points a connection slot failure at the pooled address', () => {
    expect(describeDbError(pgError('53300'))).toContain('pooled')
  })

  it('separates a host that is not found from one that refuses', () => {
    expect(describeDbError(pgError('ENOTFOUND'))).toContain('could not be found')
    expect(describeDbError(pgError('ECONNREFUSED'))).toContain('refused the connection')
  })

  it('points a certificate failure at sslmode', () => {
    expect(describeDbError(pgError('SELF_SIGNED_CERT_IN_CHAIN'))).toContain('sslmode=require')
    expect(describeDbError(new Error('self signed certificate in certificate chain'))).toContain('sslmode=require')
  })

  it('points the opposite TLS failure the other way', () => {
    expect(describeDbError(new Error('The server does not support SSL connections'))).toContain('Remove sslmode')
  })

  it('falls back to checking the address when it cannot tell', () => {
    expect(describeDbError(new Error('something unforeseen'))).toContain('Check the database address')
  })

  it('survives something that is not an Error at all', () => {
    expect(describeDbError(null)).toContain('Check the database address')
    expect(describeDbError('a string')).toContain('Check the database address')
  })

  it('takes the lead from the caller so each screen reads right', () => {
    expect(describeDbError(pgError('42P01'), 'The outline could not be saved')).toMatch(
      /^The outline could not be saved because/,
    )
  })

  it('obeys the punctuation rule, like every other string a writer reads', () => {
    const errors = [
      pgError('42P01'),
      pgError('3D000'),
      pgError('28P01'),
      pgError('42501'),
      pgError('53300'),
      pgError('ENOTFOUND'),
      pgError('ECONNREFUSED'),
      pgError('ETIMEDOUT'),
      pgError('SELF_SIGNED_CERT_IN_CHAIN'),
      new Error('The server does not support SSL connections'),
      new Error('something unforeseen'),
    ]
    for (const error of errors) {
      // The rule is about prose. A command the reader has to type verbatim is
      // exempt, because npm run db:push with the colon removed is not a command
      // and sending someone to a name that does not exist is the worse failure.
      const prose = describeDbError(error).replace(/npm run db:push|sslmode=require|sslmode/g, '')
      expect(prose).not.toMatch(/[-–—;:]/)
    }
  })
})
