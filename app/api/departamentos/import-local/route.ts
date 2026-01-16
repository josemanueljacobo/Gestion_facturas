import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { departamentos } from '@/lib/db/schema';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const filePath = path.join(process.cwd(), 'Departamento.xlsx');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File Departamento.xlsx not found in root' }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data: any[] = XLSX.utils.sheet_to_json(sheet);

        let added = 0;
        let updated = 0;

        for (const row of data) {
            const codigo = row['ID']; // Matches file header
            const nombre = row['Departamento']; // Matches file header

            if (!codigo || !nombre) continue;

            const existing = await db.query.departamentos.findFirst({
                where: eq(departamentos.codigo, codigo)
            });

            if (existing) {
                if (existing.nombre !== nombre) {
                    await db.update(departamentos)
                        .set({ nombre })
                        .where(eq(departamentos.codigo, codigo));
                    updated++;
                }
            } else {
                await db.insert(departamentos).values({
                    nombre,
                    codigo,
                });
                added++;
            }
        }

        return NextResponse.json({ success: true, added, updated });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: 'Import failed' }, { status: 500 });
    }
}
