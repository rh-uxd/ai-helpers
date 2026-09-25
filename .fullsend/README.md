# Fullsend review profiles

Each directory is a complete, independently runnable Fullsend review profile.

- `claude/` uses the Claude runtime with Vertex AI and Haiku.
- `openai/` uses the Pi runtime with OpenAI's Luna model.

The manual workflows select the profile explicitly. Keep provider credentials
and runtime-specific settings inside the matching profile.
