import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { LettersService } from '../letters/letters.service';

/**
 * One-off: re-renders every existing letter's PDF so letters issued before a renderer change (e.g.
 * the company letterhead) download in the current design. PDFs are otherwise only rendered on
 * preview / submit / sign, and downloads serve the stored file. Content is unchanged — same field
 * values and signatures — so signature document hashes stay valid. Copies already filed into an
 * employee's E-record are separate documents and are left as they were.
 *
 *   npm run letters:rerender
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const letters = app.get(LettersService, { strict: false });
    const rows: Array<{ id: number }> = await app
      .get(DataSource)
      .query('SELECT "id" FROM "letters" ORDER BY "id"');

    let done = 0;
    for (const { id } of rows) {
      try {
        await letters.preview(id);
        done += 1;
        console.log(`[letters:rerender] letter #${id} re-rendered`);
      } catch (err) {
        console.error(`[letters:rerender] letter #${id} failed:`, (err as Error).message);
      }
    }
    console.log(`[letters:rerender] ${done}/${rows.length} letters re-rendered`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
