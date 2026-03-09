# Fix: annotator.perfectpixels.com Not Loading

DNS is correct (points to Vercel). The issue is likely **Vercel domain setup** or **GoDaddy**.

---

## 1. Add domain in Vercel

1. Vercel project → **Settings** → **Domains**
2. Click **Add**
3. Enter: `annotator.perfectpixels.com`
4. Vercel will show status:
   - **Valid** (green) = ready
   - **Pending** = waiting for DNS / SSL
   - **Error** = configuration issue

---

## 2. Fix GoDaddy "expired token"

If GoDaddy won't let you edit DNS:

1. **Log out and log back in** at godaddy.com
2. **Use incognito/private window**
3. **Clear cookies** for godaddy.com
4. If it persists, contact **GoDaddy support**

---

## 3. Verify DNS in GoDaddy

Once you can edit, ensure you have:

| Type  | Name      | Value                 |
|-------|-----------|-----------------------|
| CNAME | annotator | cname.vercel-dns.com  |

- No trailing period in the value
- Remove any old **A** record for `annotator` pointing to `35.89.195.188`

---

## 4. Wait for SSL

After adding the domain in Vercel, SSL can take 1–5 minutes. Check status in Vercel → Domains.

---

## 5. Test

```bash
# Should resolve to Vercel
dig annotator.perfectpixels.com +short
# Expect: cname.vercel-dns.com. and/or 76.76.21.x
```

Then open https://annotator.perfectpixels.com in a browser.
