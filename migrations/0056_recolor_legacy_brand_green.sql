PRAGMA foreign_keys = ON;

-- Recolor the legacy brand-green notebook default (was inserted by migrations
-- 0001/0010/0046 and is not offered by the notebook color picker).
UPDATE notebooks
SET
  color = '#0284c7',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE color = '#0f766e';

-- Rewrite old brand-green palette literals already stored in note content
-- (mermaid classDef colors baked in before the rebrand), matching both cases.
UPDATE memos
SET
  excerpt = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(excerpt, '#16A06E', '#0284C7'), '#16a06e', '#0284c7'), '#E7F6EF', '#E7F1FA'), '#e7f6ef', '#e7f1fa'), '#145C40', '#0C4A6E'), '#145c40', '#0c4a6e'), '#6F9B88', '#6E8FB0'), '#6f9b88', '#6e8fb0'), '#1C3D31', '#16324A'), '#1c3d31', '#16324a'), '#1B2420', '#191F28'), '#1b2420', '#191f28'), '#5B7569', '#5A6E85'), '#5b7569', '#5a6e85'), '#E8F2ED', '#E8EFF7'), '#e8f2ed', '#e8eff7'), '#4DB58B', '#29A8E0'), '#4db58b', '#29a8e0'), '#1A3329', '#13253A'), '#1a3329', '#13253a'), '#D8F3E6', '#D8EFF9'), '#d8f3e6', '#d8eff9');

UPDATE memo_contents
SET
  content_json = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(content_json, '#16A06E', '#0284C7'), '#16a06e', '#0284c7'), '#E7F6EF', '#E7F1FA'), '#e7f6ef', '#e7f1fa'), '#145C40', '#0C4A6E'), '#145c40', '#0c4a6e'), '#6F9B88', '#6E8FB0'), '#6f9b88', '#6e8fb0'), '#1C3D31', '#16324A'), '#1c3d31', '#16324a'), '#1B2420', '#191F28'), '#1b2420', '#191f28'), '#5B7569', '#5A6E85'), '#5b7569', '#5a6e85'), '#E8F2ED', '#E8EFF7'), '#e8f2ed', '#e8eff7'), '#4DB58B', '#29A8E0'), '#4db58b', '#29a8e0'), '#1A3329', '#13253A'), '#1a3329', '#13253a'), '#D8F3E6', '#D8EFF9'), '#d8f3e6', '#d8eff9'),
  content_markdown = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(content_markdown, '#16A06E', '#0284C7'), '#16a06e', '#0284c7'), '#E7F6EF', '#E7F1FA'), '#e7f6ef', '#e7f1fa'), '#145C40', '#0C4A6E'), '#145c40', '#0c4a6e'), '#6F9B88', '#6E8FB0'), '#6f9b88', '#6e8fb0'), '#1C3D31', '#16324A'), '#1c3d31', '#16324a'), '#1B2420', '#191F28'), '#1b2420', '#191f28'), '#5B7569', '#5A6E85'), '#5b7569', '#5a6e85'), '#E8F2ED', '#E8EFF7'), '#e8f2ed', '#e8eff7'), '#4DB58B', '#29A8E0'), '#4db58b', '#29a8e0'), '#1A3329', '#13253A'), '#1a3329', '#13253a'), '#D8F3E6', '#D8EFF9'), '#d8f3e6', '#d8eff9'),
  content_text = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(content_text, '#16A06E', '#0284C7'), '#16a06e', '#0284c7'), '#E7F6EF', '#E7F1FA'), '#e7f6ef', '#e7f1fa'), '#145C40', '#0C4A6E'), '#145c40', '#0c4a6e'), '#6F9B88', '#6E8FB0'), '#6f9b88', '#6e8fb0'), '#1C3D31', '#16324A'), '#1c3d31', '#16324a'), '#1B2420', '#191F28'), '#1b2420', '#191f28'), '#5B7569', '#5A6E85'), '#5b7569', '#5a6e85'), '#E8F2ED', '#E8EFF7'), '#e8f2ed', '#e8eff7'), '#4DB58B', '#29A8E0'), '#4db58b', '#29a8e0'), '#1A3329', '#13253A'), '#1a3329', '#13253a'), '#D8F3E6', '#D8EFF9'), '#d8f3e6', '#d8eff9');

UPDATE memo_revisions
SET
  content_json = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(content_json, '#16A06E', '#0284C7'), '#16a06e', '#0284c7'), '#E7F6EF', '#E7F1FA'), '#e7f6ef', '#e7f1fa'), '#145C40', '#0C4A6E'), '#145c40', '#0c4a6e'), '#6F9B88', '#6E8FB0'), '#6f9b88', '#6e8fb0'), '#1C3D31', '#16324A'), '#1c3d31', '#16324a'), '#1B2420', '#191F28'), '#1b2420', '#191f28'), '#5B7569', '#5A6E85'), '#5b7569', '#5a6e85'), '#E8F2ED', '#E8EFF7'), '#e8f2ed', '#e8eff7'), '#4DB58B', '#29A8E0'), '#4db58b', '#29a8e0'), '#1A3329', '#13253A'), '#1a3329', '#13253a'), '#D8F3E6', '#D8EFF9'), '#d8f3e6', '#d8eff9'),
  content_markdown = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(content_markdown, '#16A06E', '#0284C7'), '#16a06e', '#0284c7'), '#E7F6EF', '#E7F1FA'), '#e7f6ef', '#e7f1fa'), '#145C40', '#0C4A6E'), '#145c40', '#0c4a6e'), '#6F9B88', '#6E8FB0'), '#6f9b88', '#6e8fb0'), '#1C3D31', '#16324A'), '#1c3d31', '#16324a'), '#1B2420', '#191F28'), '#1b2420', '#191f28'), '#5B7569', '#5A6E85'), '#5b7569', '#5a6e85'), '#E8F2ED', '#E8EFF7'), '#e8f2ed', '#e8eff7'), '#4DB58B', '#29A8E0'), '#4db58b', '#29a8e0'), '#1A3329', '#13253A'), '#1a3329', '#13253a'), '#D8F3E6', '#D8EFF9'), '#d8f3e6', '#d8eff9');

