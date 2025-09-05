import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function GET({ params, request }) {
  try {
    const { filename } = params;
    
    // Construct the file path
    const uploadsDir = path.join(__dirname, '../../../../public/uploads');
    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return new Response('Image not found', { status: 404 });
    }
    
    // Read the file
    const fileBuffer = await fs.readFile(filePath);
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg'; // default
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      case '.jpg':
      case '.jpeg':
      default:
        contentType = 'image/jpeg';
        break;
    }
    
    // Return the image with proper headers
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Error serving image:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');
    const filename = formData.get('filename');
    
    if (!imageFile || !(imageFile instanceof File)) {
      return new Response(JSON.stringify({ error: 'No image file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Ensure upload directory exists
    const uploadsDir = path.join(__dirname, '../../../../public/uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Generate unique filename if not provided
    const finalFilename = filename || `gpt-${Date.now()}.png`;
    const filePath = path.join(uploadsDir, finalFilename);
    
    // Convert file to buffer and save
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);
    
    console.log('💾 GPT image saved locally:', finalFilename);
    
    // Return success response with local URL
    return new Response(JSON.stringify({
      success: true,
      url: `/api/uploads/${finalFilename}`,
      filename: finalFilename,
      size: imageFile.size,
      type: imageFile.type
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error uploading GPT image:', error);
    return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
