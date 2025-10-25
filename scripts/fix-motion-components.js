const fs = require('fs');
const path = require('path');

// Fix motion components in automation page
const filePath = 'app/admin/automation/page.tsx';



try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace motion.div with div and remove animation props
  content = content.replace(
    /<motion\.div\s+[^>]*initial=\{[^}]*\}\s+animate=\{[^}]*\}\s*([^>]*)>/g,
    '<div$1>'
  );
  
  // Replace any remaining motion.div
  content = content.replace(/<motion\.div/g, '<div');
  content = content.replace(/<\/motion\.div>/g, '</div>');
  
  // Remove motion import
  content = content.replace(/import { motion } from 'framer-motion'\n/, '');
  
  fs.writeFileSync(filePath, content);
  
  
} catch (error) {
  console.error('❌ Error fixing motion components:', error.message);
}
