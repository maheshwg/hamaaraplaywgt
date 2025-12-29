# S3 Static Website Hosting Configuration for React Router

## Critical: Configure Error Document

For React Router to work with S3, you **MUST** set the error document to `index.html`.

### Using AWS Console:

1. Go to S3 bucket: `youraitester.com`
2. Click **Properties** tab
3. Scroll to **Static website hosting**
4. Click **Edit**
5. Enable static website hosting
6. Set:
   - **Index document**: `index.html`
   - **Error document**: `index.html` ⚠️ **CRITICAL for React Router!**
7. Save

### Using AWS CLI:

```bash
aws s3 website s3://youraitester.com \
  --index-document index.html \
  --error-document index.html \
  --region us-east-2
```

## Why This Is Needed

Without the error document set to `index.html`:
- S3 returns 404 for routes like `/`, `/Home`, etc.
- React Router never gets a chance to handle routing
- You see errors or redirects

With error document = `index.html`:
- All routes serve `index.html`
- React Router handles routing client-side
- Landing page works correctly

## Additional: Clear Browser Storage

If you still see redirects after S3 config:
1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Local Storage** → your domain
4. Delete all items (especially `jwtToken`, `userRole`, `tokenTimestamp`)
5. Refresh the page

## Test

After configuration, access:
```
http://youraitester.com.s3-website-us-east-2.amazonaws.com
```

You should see the landing page, not a redirect to login.
