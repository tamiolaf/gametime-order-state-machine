export async function GET() {
  return Response.json({
    randomNumber: Math.random(),
  })
}