# Curriculum Import Tool

A Node.js script to import `bundle.json` data into your Supabase database.

## Setup

1. **Create `.env` file** in the project root:
   ```env
   SUPABASE_URL=YOUR_SUPABASE_URL
   SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY
   ```

2. **Place your `bundle.json` file** in the `curriculum-import` folder

3. **Install dependencies** (already done):
   ```bash
   npm install
   ```

## Usage

Run the import script:
```bash
npm run import
```

Or directly:
```bash
node import.js
```

## Next Steps

The `import.js` file contains a template. You need to:

1. Review the structure of your `bundle.json`
2. Map the JSON data to your Supabase table schema
3. Implement the insertion logic in the `importBundle()` function

Example insertion:
```javascript
const { data, error } = await supabase
  .from('your_table_name')
  .insert(yourMappedData);

if (error) {
  console.error('Insert error:', error);
} else {
  console.log('✅ Data inserted successfully');
}
```

