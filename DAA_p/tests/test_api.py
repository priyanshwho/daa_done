import urllib.request
import json

# Test /health
response = urllib.request.urlopen("http://localhost:5000/health")
print("Health check:", json.loads(response.read().decode()))

# Test /rank
payload = {
    "strategy": "price_desc",
    "algorithm": "merge_sort",
    "k": 5
}
req = urllib.request.Request(
    "http://localhost:5000/rank",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"}
)
response = urllib.request.urlopen(req)
print("\nTop 5 by price (descending):")
print(json.dumps(json.loads(response.read().decode()), indent=2))

# Test another strategy
payload = {
    "strategy": "rating_desc",
    "algorithm": "merge_sort",
    "k": 10
}
req = urllib.request.Request(
    "http://localhost:5000/rank",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"}
)
response = urllib.request.urlopen(req)
print("\nTop 10 by rating (descending):")
print(json.dumps(json.loads(response.read().decode()), indent=2))

