# How to Add Products to HRZ Store

Currently, your store uses a **Local Admin Panel**. This allows you to add products directly from your browser.

## Step 1: Go to the Login Page
1. Open your website (`index.html`).
2. Scroll to the very bottom (Footer).
3. Click the small link: **Admin Login**.
   - Or go directly to: `login.html`

## Step 2: Login
Use these credentials (you can change them in the code later):
- **Email:** `admin@hrz.com`
- **Password:** `admin123`

## Step 3: Add a Product
1. Once logged in, you will see the **Admin Dashboard**.
2. Click the **+ Add Product** button.
3. Fill in the details:
   - **Name**: e.g. "Shadow Hoodie"
   - **Price**: e.g. 250
   - **Description**: "Best hoodie ever."
   - **Image (Front)**: `assets/zoro_front.png` (You can use a URL from the internet too!)
   - **Image (Back)**: `assets/zoro_back.png`
4. Click **Save Product**.

## Step 4: Verify
1. Go back to the **Home Page**.
2. Refresh.
3. Your new product is now live in the store!

---

### ⚠️ Important Note
Since we haven't connected a Cloud Database (Firebase) yet:
- These products are saved in **your browser's storage**.
- If you send the website link to a friend, **they won't see these new products** unless we upgrade to a database.
- If you clear your browser cache, the new products will disappear.

**Ready to upgrade to a real database?** Just let me know!
