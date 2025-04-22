# 🧪 Batch Sheet SQL Generator Guide

---

## ✨ Extracting **Batch Instructions**

### Step-by-step walkthrough:

1. **Go to the `Read Formula` page**  
   This is where everything starts.

2. **Upload your Excel file**  
   Make sure the sheet has proper step-wise batch instructions.

   ![Upload Example](https://github.com/user-attachments/assets/fa202eea-7a6d-4448-9649-f65c3bf2f52b)

3. **Enter the FNG Number**  
   This identifies the specific batch you're working with.

4. **Review the Auto-Generated Table**  
   - A table will appear showing your batch steps.
   - Cross-check with your original sheet.
   - You can edit any **cell**, **column name**, or **row** to match your database schema.

5. **Need to add or remove columns/rows?**  
   - **Right-click** on any column/row header for options:
     - ➕ Add new column/row  
     - ❌ Delete column/row

   ![Edit Table Example](https://github.com/user-attachments/assets/567bb79a-5b82-428e-9a91-10f4a1b4b06e)

6. **All set? Click `Generate SQL`**  
   This will download a `.sql` file containing:
   - `CREATE TABLE` statement  
   - `INSERT INTO` statements for your batch data

---

## 🏷️ Extracting **Batch Datex / Finished Goods Table**

### 📦 For `batch_datex` Table:

1. **Stay on the `Home` page**  
   This is where the batch datex extraction starts.

2. Follow these steps:
   - Reload the page (important step).
   - Upload your Excel file.
   - Click on the `Load Sheet` button.
   - Now all the tabs in your sheet will be available to select.
   - ✅ **Check both**: `No Header` and `Horizontal` mode.

3. **Define Table Ranges**  
   - You'll see **two input fields** to enter the cell ranges.
   - Input the cell ranges you want to extract.

   ![Batch Datex Example](https://github.com/user-attachments/assets/fcfef64a-34be-4ed9-af16-c49c3c841a24)

4. **Edit If Needed**  
   - You can update headers or cell values to match your database columns.

5. **Click `Generate SQL`**  
   - Your SQL file will be downloaded.

---

### 📊 For `finished_goods` Table:

1. **Reload the page again**
2. Upload your Excel file.
3. Click on the `Load Sheet` button.
4. All sheet tabs will now be available.

5. **Uncheck `Horizontal`**  
   - This makes the table vertical (important for finished_goods).

6. **Provide Table Ranges**
   - First, select the **Batch Overview** tab and provide the range.
   - Then switch to **Datex** or **Calculations** tab and provide the second range.

   ![Finished Goods Example](https://github.com/user-attachments/assets/c11dfd6f-6da3-4ae9-9d3c-d8ee35179b56)

7. **Click `Generate SQL`**  
   - The `.sql` file for your finished goods data will be downloaded.

---
