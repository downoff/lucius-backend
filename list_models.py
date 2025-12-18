import google.generativeai as genai
import os

# Mock the key if running locally without one, essentially just to show code structure,
# but we need the real key to list models.
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("No GOOGLE_API_KEY found. Cannot list models.")
else:
    genai.configure(api_key=api_key)
    print("Listing available models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
