```js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON received by submit function' })
    };
  }

  console.log('PAYLOAD RECEIVED:', JSON.stringify(body, null, 2));

  if (!body.firmName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Firm name is required' }) };
  }

  if (!body.reviewBody) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Review body is required' }) };
  }

  if (!body.sourceType) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Source type is required' }) };
  }

  if (
    (body.sourceType === 'verified' || body.sourceType === 'unverified') &&
    !body.authorEmail
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Email is required for homeowner reviews' })
    };
  }

  let imageUrl = null;

  if (body.imageBase64 && body.imageFileName) {
    try {
      const imageBuffer = Buffer.from(body.imageBase64, 'base64');
      const fileName = `${Date.now()}-${body.imageFileName.replace(/[^a-zA-Z0-9._-]/g, '')}`;

      const { error: uploadError } = await supabase.storage
        .from('review-images')
        .upload(fileName, imageBuffer, {
          contentType: body.imageContentType || 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
      } else {
        const { data: urlData } = supabase.storage
          .from('review-images')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }
    } catch (imageError) {
      console.error('Image processing error:', imageError);
    }
  }

  const insertPayload = {
    firm_id: body.firmId || null,
    firm_name: body.firmName,
    is_new_firm: body.isNewFirm || false,
    source_type: body.sourceType,
    rating: body.rating ? parseInt(body.rating) : null,
    review_title: body.reviewTitle || null,
    review_body: body.reviewBody,
    tags: body.tags || null,
    author_name: body.authorName || null,
    author_email: body.authorEmail || null,
    property_type: body.propertyType || null,
    contract_month: body.contractMonth || null,
    contract_year: body.contractYear || null,
    reddit_username: body.redditUsername || null,
    source_url: body.sourceUrl || null,
    original_post_date: body.originalPostDate || null,
    media_url: body.mediaUrl || null,
    media_source: body.mediaSource || null,
    image_url: imageUrl,
    status: 'pending'
  };

  console.log('INSERT PAYLOAD:', JSON.stringify(insertPayload, null, 2));

  const { data, error } = await supabase
    .from('submissions')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error('SUPABASE INSERT ERROR:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
    };
  }

  console.log('INSERT SUCCESS:', data);

  try {
    await fetch(`${process.env.URL || ''}/.netlify/functions/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firmName: body.firmName,
        sourceType: body.sourceType,
        reviewTitle: body.reviewTitle,
        authorName: body.authorName
      })
    });
  } catch (notifyError) {
    console.error('Notify error, but submission was saved:', notifyError);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      submissionId: data.id
    })
  };
};
```
