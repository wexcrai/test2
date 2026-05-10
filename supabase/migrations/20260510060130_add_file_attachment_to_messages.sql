/*
  # Add file_attachment column to messages table

  1. Modified Tables
    - `messages`
      - `file_attachment` (jsonb, optional) - stores file name, type, and extracted text content

  2. Security
    - No changes to RLS policies (existing policies cover this column)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'file_attachment'
  ) THEN
    ALTER TABLE messages ADD COLUMN file_attachment jsonb;
  END IF;
END $$;
