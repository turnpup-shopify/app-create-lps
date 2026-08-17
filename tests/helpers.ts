import type { Claim, Product, Repository, Worry } from '@/lib/outline/types'

export function worry(id: string, extra: Partial<Worry> = {}): Worry {
  return {
    id,
    product: '*',
    label: `worry ${id}`,
    detail: `answer ${id}`,
    tags: '',
    ...extra,
  }
}

export function claim(id: string, extra: Partial<Claim> = {}): Claim {
  return { id, product: '*', label: `claim ${id}`, detail: `support ${id}`, ...extra }
}

export function product(id: string, extra: Partial<Product> = {}): Product {
  return { id, label: `product ${id}`, detail: '', ...extra }
}

export function repository(partial: Partial<Repository> = {}): Repository {
  return { products: [], claims: [], worries: [], ...partial }
}
