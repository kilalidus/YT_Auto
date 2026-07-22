// src/app/api/debug-db/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const tables = await db.$queryRawUnsafe(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname='public'
      ORDER BY tablename;
    `);

    const users = await db.$queryRawUnsafe(`
      SELECT COUNT(*) FROM "User";
    `);

    return NextResponse.json({
      database: process.env.DATABASE_URL?.split("@")[1],
      tables,
      users,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : String(e),
        database: process.env.DATABASE_URL?.split("@")[1],
      },
      { status: 500 }
    );
  }
}