# 🚀 Getting Started

### 📦 Clone the Repository

```bash
git clone https://github.com/ullas-js/xlsx-extract.git
# or
git clone git@github.com:ullas-js/xlsx-extract.git
cd xlsx-extract
```

### 📁 Install Dependencies

```bash
npm install
# or
npm i
```

### ▶️ Run the Project Locally

```bash
npm start
# or
npm run start
```

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
  
     
```sql
-- Create table for rcp_batch_step_rm_dtl
CREATE TABLE rcp_batch_step_rm_dtl (
    Fngnumber VARCHAR(255),
    Step VARCHAR(255),
    stepseq VARCHAR(255),
    rmstepseq VARCHAR(255),
    rawmaterial VARCHAR(255),
    Vendor VARCHAR(255),
    Incredient_description VARCHAR(255),
    Type VARCHAR(255),
    Speed VARCHAR(255),
    Temp VARCHAR(255),
    Concentration VARCHAR(255),
    Mixerneeded VARCHAR(255)
);

-- Insert data for rcp_batch_step_rm_dtl
INSERT INTO rcp_batch_step_rm_dtl (
  Fngnumber, Step, stepseq, rmstepseq, rawmaterial, Vendor, Incredient_description, Type, Speed, Temp, Concentration, Mixerneeded
) VALUES (
  '92', 3, 2, 1, 'GLY20KGALPHA982134', 'Univar Solutions', 'Glycerol Monostearate', 'Liquid', 1.25, '145° F', '10%', 75
);

-- -------------------------->

-- Create table for rcp_btch_card_instr
CREATE TABLE rcp_btch_card_instr (
    Fngnumber VARCHAR(255),
    Step VARCHAR(255),
    stepseq VARCHAR(255),
    Action VARCHAR(255)
);

-- Insert data for rcp_btch_card_instr

INSERT INTO rcp_btch_card_instr (Fngnumber, Step, stepseq, Action) VALUES 
('92', 1, 1, 'Transfer 25kg of raw material from Storage Tank A into Mixing Vessel 1. Ensure flow rate is controlled.'),
('92', 2, 1, 'Preheat 150° F water and slowly meter into Mixer. Begin agitation once temperature stabilizes.'),
('92', 3, 1, 'Add thickening agent gradually into the vortex. Mix for 10 minutes or until fully dispersed.'),
('92', 4, 1, 'Add 5L of ethanol to the mixer under a fume hood. Stir continuously for 3 minutes.'),
('92', 5, 1, 'Perform pH adjustment to target range (4.5 - 5.5). Use citric acid solution dropwise while mixing.');

```
---

## 🏷️ Extracting **Batch Datex / Finished Goods Table / Raw Materials**

### 📦 For `batch_datex/raw_material_item_new` Table:

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

```sql

-- Create table for batch_datex

CREATE TABLE batch_datex (
    rm_item_id VARCHAR(255),
    item_number VARCHAR(255),
    vendor VARCHAR(255),
    item VARCHAR(255),
    type VARCHAR(255),
    LBS_per_batch VARCHAR(255),
    LBS_per_gal VARCHAR(255),
    fng_item_number VARCHAR(255)
);

-- Insert data for batch_datex

INSERT INTO batch_datex (rm_item_id, item_number, vendor, item, type, LBS_per_batch, LBS_per_gal, fng_item_number) VALUES 
('10', 'RM-AX1290', 'GlobeChem', 'Maltodextrin Powder', 'Dry', '120.45', '0.12045', '92'),
('11', 'RM-LQ5622', 'PrimeSolv', 'Glycerin USP Grade', 'Liquid', '300.00', '0.30000', '92'),
('12', 'RM-DR9874', 'NaturX', 'Ascorbic Acid (Vitamin C)', 'Dry', '18.75', '0.01875', '92'),
('13', 'RM-ET1220', 'SunEthanol', 'Denatured Ethanol 190 Proof', 'Liquid', '3,000.00', '', '92'),
('14', 'RM-SW8888', 'ClearH2O', 'Spring Water Treated', 'Liquid', '620.00', '0.62000', '92');

```

```sql

-- Create table for raw_material_item_new

CREATE TABLE raw_material_item_new (
    fng_item_number VARCHAR(255),
    RMUID VARCHAR(255),
    rm_item VARCHAR(255),
    vendor VARCHAR(255),
    rm_desc VARCHAR(255),
    rm_unit VARCHAR(255),
    rm_value VARCHAR(255),
    units_in_lb VARCHAR(255),
    rm_sort_for_item VARCHAR(255),
    rm_type VARCHAR(255)
);

-- Insert data for raw_material_item_new

INSERT INTO raw_material_item_new (fng_item_number, RMUID, rm_item, vendor, rm_desc, rm_unit, rm_value, units_in_lb, rm_sort_for_item, rm_type) VALUES ('40', '2', 'P000ELB', 'Greenfield', 'Ethyl Lactate Blender (22.0% ABV, 3,733.6 Gal.)', NULL, NULL, ' 29,693.94 ', NULL, 'Liquid');
INSERT INTO raw_material_item_new (fng_item_number, RMUID, rm_item, vendor, rm_desc, rm_unit, rm_value, units_in_lb, rm_sort_for_item, rm_type) VALUES ('40', '3', 'SF-1268.2', 'Sovereign Flavors', 'Natural Fruit Punch Flavor TTB#140', NULL, NULL, ' 790.11 ', NULL, 'Liquid');
INSERT INTO raw_material_item_new (fng_item_number, RMUID, rm_item, vendor, rm_desc, rm_unit, rm_value, units_in_lb, rm_sort_for_item, rm_type) VALUES ('40', '5', 'DPKING50LBSGR103533', 'Batory Foods', 'Sugar', NULL, NULL, ' 844.20 ', NULL, 'Dry');
INSERT INTO raw_material_item_new (fng_item_number, RMUID, rm_item, vendor, rm_desc, rm_unit, rm_value, units_in_lb, rm_sort_for_item, rm_type) VALUES ('40', '7', 'DPK50LBSTRICA987689', 'Brenntag', 'Tripotassium Citrate', NULL, NULL, ' 46.80 ', NULL, 'Dry');
INSERT INTO raw_material_item_new (fng_item_number, RMUID, rm_item, vendor, rm_desc, rm_unit, rm_value, units_in_lb, rm_sort_for_item, rm_type) VALUES ('40', '8', 'DPKING50LBCAJX01', 'Westco Chemicals', 'Citric Acid', NULL, NULL, ' 384.12 ', NULL, 'Dry');

```

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

```sql

-- Create table for finished_goods

CREATE TABLE finished_goods (
    finished_goods_item_number VARCHAR(255),
    finished_good_brand_company VARCHAR(255),
    formula_description VARCHAR(255),
    formula_number VARCHAR(255),
    formula_revision_date VARCHAR(255),
    throw_ratio VARCHAR(255),
    finished_good_unit_size VARCHAR(255),
    finished_goods_units_per_case VARCHAR(255),
    rm_syrup_gallons VARCHAR(255)
);

-- Insert data for finished_goods

INSERT INTO finished_goods (finished_goods_item_number, finished_good_brand_company, formula_description, formula_number, formula_revision_date, throw_ratio, finished_good_unit_size, finished_goods_units_per_case, rm_syrup_gallons) 
VALUES ('96', 'FreshFizz Co.', 'Mango Blast', 'FD-58219.3', '2024-03-08', '2.890', '16.0', '12.0', '850.00');

```

---
