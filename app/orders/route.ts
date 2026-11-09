const OrderState = {
    initialized: 'INITIALIZED',
    payment_authorized: 'PAYMENT_AUTHORIZED',
    cancelled: 'CANCELLED',
    complete: 'COMPLETE',
    declined: 'DECLINED',
    needs_attention: 'NEEDS_ATTENTION'
} as const

type OrderState = (typeof OrderState)[keyof typeof OrderState]

const orders = new Map();

export async function GET() {
  return Response.json({
    orderID: Math.random(),
  })
}