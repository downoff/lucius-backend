import os
from abc import ABC, abstractmethod
from typing import Optional
import openai
import anthropic
import google.generativeai as genai
from app.core.config import settings

class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, json_mode: bool = False) -> str:
        pass

class OpenAIProvider(LLMProvider):
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini" # Default "Fast/Cheap"

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, json_mode: bool = False) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        kwargs = {"model": self.model, "messages": messages}
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
            
        response = await self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content

class AnthropicProvider(LLMProvider):
    def __init__(self):
        # Fallback to OpenAI key if Anthropic not set, just to prevent crash on init, 
        # but usage will fail or check before usage.
        self.client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        self.model = "claude-3-sonnet-20240229"

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, json_mode: bool = False) -> str:
        if not os.getenv("ANTHROPIC_API_KEY"):
            raise ValueError("ANTHROPIC_API_KEY not set")
            
        kwargs = {
            "model": self.model,
            "max_tokens": 4000,
            "messages": [{"role": "user", "content": prompt}]
        }
        if system_prompt:
            kwargs["system"] = system_prompt
            
        response = await self.client.messages.create(**kwargs)
        return response.content[0].text

class GeminiProvider(LLMProvider):
    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY", ""))
        self.model = genai.GenerativeModel('gemini-1.5-pro')

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, json_mode: bool = False) -> str:
        if not os.getenv("GOOGLE_API_KEY"):
             raise ValueError("GOOGLE_API_KEY not set")

        # Gemini handles system prompts differently or just prepended
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"System: {system_prompt}\n\nUser: {prompt}"
            
        response = await self.model.generate_content_async(full_prompt)
        return response.text

class LLMFactory:
    @staticmethod
    def get_provider(task_type: str = "general") -> LLMProvider:
        """
        Routing Logic:
        - 'writing' -> Gemini 1.5 Pro (Replaced Anthropic due to billing)
        - 'context' -> Gemini 1.5 Pro (Huge Window)
        - 'fast'/'data' -> OpenAI (Structured/Fast)
        """
        
        # Check available keys
        has_gemini = bool(os.getenv("GOOGLE_API_KEY"))
        has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY")) # kept as legacy/backup
        
        if task_type == "writing":
            if has_gemini:
                 return GeminiProvider() # Now the default writer
            elif has_anthropic:
                 return AnthropicProvider()
            else:
                 return OpenAIProvider()
                 
        elif task_type == "context" and has_gemini:
            return GeminiProvider()
        else:
            return OpenAIProvider() # Default Workhorse
