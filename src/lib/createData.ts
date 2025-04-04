import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { dataTable } from 'src/db/data-schema';

const db = drizzle(process.env.DATABASE_URL!);

export default async function createData(data : Array<Record<string, any>>, date : Date) {
    // Construct row of the current data node with all its attributes
    const entry : typeof dataTable.$inferInsert = {
        datetime: date,
        name: data[0].name,
        type: data[0].type,
        value: data[0].value,
        updated_at: date
    };
    
    // Insert row into the database
    try {
        await db.insert(dataTable).values(entry);
        console.log("Insertion successful:", entry);
    } catch (error) {
        console.error("Database Insertion Error:", error);
    }
}