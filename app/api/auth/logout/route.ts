import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/", req.url));
  response.cookies.delete("deriv_access_token");
  response.cookies.delete("deriv_account_id");
  response.cookies.delete("deriv_account_type");
  return response;
}
