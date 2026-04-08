# Dataset Documentation

## 1 Overview

**Amazon Products Sales 42K (2025)**

- **Source**: [Kaggle](https://www.kaggle.com/datasets/ikramshah512/amazon-products-sales-dataset-42k-items-2025)
- **License**: CC BY-NC 4.0 (non-commercial, academic research use)
- **Scale**: 42,000+ products
- **Format**: Single CSV table
- **Last Updated**: January 2025

## 2 Dataset Attributes

### 2.1 Core Attributes (Always Active)

| Attribute  | Type    | Role       | Description                           |
|------------|---------|------------|---------------------------------------|
| `product_id` | Integer | Identifier | Unique product ID from Amazon         |
| `price`    | Float   | Cost       | Product price in USD                  |
| `rating`   | Float   | Benefit    | Average customer rating (0–5 scale) |

### 2.2 Optional Attributes (Feature-Activated)

| Attribute       | Type    | Description              |
|-----------------|---------|--------------------------|
| `discount`      | Float   | Discount percentage      |
| `reviews_count` | Integer | Number of customer reviews |
| `delivery_time` | Integer | Estimated days to delivery |
| `category`      | String  | Product category         |

## 3 Data Loading

Simple CSV load:

- Read CSV file
- Infer numeric vs string columns
- Skip rows with missing core attributes (`price`, `rating`)
- Keep optional columns if present
- Total valid records must be >= 1000

## 4 Data Quality Notes

### 4.1 Core Attribute Validation

- `price`: Must be numeric and positive
- `rating`: Must be numeric and in range [0, 5]
- Rows missing either are skipped

### 4.2 Optional Attribute Handling

- Optional columns (`discount`, `reviews_count`, `delivery_time`, `category`) are used if present
- Non-numeric values in numeric columns cause that row to be skipped for sorting
- String columns (e.g., `category`) are accepted as-is

## 5 Schema Mapping

### 5.1 CSV Column Names

Expected CSV headers (case-insensitive):

```
product_id, price, rating, discount, reviews_count, delivery_time, category
```

Additional columns are ignored.

## 6 References

- **Kaggle Dataset**: [Amazon Products Sales Dataset 42K Items 2025](https://www.kaggle.com/datasets/ikramshah512/amazon-products-sales-dataset-42k-items-2025)
- **License**: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)
- **Project Spec**: [project.md](project.md)
- **Readme**: [README.md](README.md)
