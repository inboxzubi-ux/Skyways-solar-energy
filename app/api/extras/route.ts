import { NextResponse } from 'next/server';

let expenses = [];
let projects = [];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  if (type === 'projects') {
    return NextResponse.json(projects);
  }
  return NextResponse.json(expenses);
}

export async function POST(req) {
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
