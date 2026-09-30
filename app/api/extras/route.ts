import { NextRequest, NextResponse } from 'next/server';

interface Expense {
  id: number;
  createdAt: Date;
  [key: string]: unknown;
}

interface Project {
  id: number;
  createdAt: Date;
  [key: string]: unknown;
}

let expenses: Expense[] = [];
let projects: Project[] = [];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  if (type === 'projects') {
    return NextResponse.json(projects);
  }
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.type === 'project') {
    const newProj = { id: projects.length + 1, ...body, createdAt: new Date() };
    projects.push(newProj);
    return NextResponse.json(newProj);
  }
  const newExp = { id: expenses.length + 1, ...body, createdAt: new Date() };
  expenses.push(newExp);
  return NextResponse.json(newExp);
}
