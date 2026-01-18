import { NextRequest, NextResponse } from 'next/server';

export interface ParsePdfResponse {
    success: boolean;
    text: string;
    numPages: number;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ParsePdfResponse>> {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, text: '', numPages: 0, error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json(
                { success: false, text: '', numPages: 0, error: 'File must be a PDF' },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdf = require('pdf-parse/lib/pdf-parse');

        const pdfData = await pdf(buffer);

        return NextResponse.json({
            success: true,
            text: pdfData.text,
            numPages: pdfData.numpages,
        });
    } catch (error) {
        console.error('PDF parse error:', error);
        return NextResponse.json(
            {
                success: false,
                text: '',
                numPages: 0,
                error: error instanceof Error ? error.message : 'Failed to parse PDF',
            },
            { status: 500 }
        );
    }
}
