import pandas as pd
df = pd.read_csv('Dataset/amazon_products_sales_data/amazon_products_sales_data_cleaned.csv')
print("Columns:", df.columns.tolist())
print(f"Shape: {df.shape}")
print(f"First row:\n{df.iloc[0]}")
