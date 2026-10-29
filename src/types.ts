export type TransactionType = 'income' | 'expense'
export type Transaction = {
  id: string
  user_id: string
  title: string
  amount: number
  type: TransactionType
  category: string
  transaction_date: string
  note: string | null
  created_at: string
}
export type Budget = {
  id: string
  user_id: string
  month: string
  limit_amount: number
  created_at: string
}
