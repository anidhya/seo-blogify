FROM nousresearch/hermes-agent:main

USER root

# Only git is needed — the agent image already has python3 and its own venv
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3-cryptography \
    python3-yaml && \
    rm -rf /var/lib/apt/lists/*

# Clone hermes-webui
RUN git clone https://github.com/nesquena/hermes-webui.git /opt/hermes-webui

# Install WebUI/agent deps into the agent's venv and system Python. Railway's
# configured start command still invokes plain `python server.py`, which can
# resolve to /usr/bin/python, so chat-time imports must work there too.
RUN uv pip install --quiet --no-cache-dir \
    --python /opt/hermes/.venv/bin/python \
    "pyyaml>=6.0" \
    "cryptography>=42.0" \
    "python-dotenv>=1.0" \
    "requests>=2.32" \
    "httpx>=0.27"
RUN uv pip install --quiet --no-cache-dir --system --break-system-packages \
    "pyyaml>=6.0" \
    "cryptography>=42.0" \
    "python-dotenv>=1.0" \
    "requests>=2.32" \
    "httpx>=0.27" \
    -e /opt/hermes
RUN cd /opt/hermes-webui && /usr/bin/python -c "import sys; sys.path.append('/opt/hermes'); from run_agent import AIAgent; print(AIAgent.__name__)"

ENV PATH=/opt/hermes/.venv/bin:$PATH
ENV HERMES_WEBUI_PYTHON=/opt/hermes/.venv/bin/python

# Bind all interfaces (required for Railway's port routing).
ENV HERMES_WEBUI_HOST=0.0.0.0

# run_agent.py lives at /opt/hermes/run_agent.py — added to sys.path by api/config.py
ENV HERMES_WEBUI_AGENT_DIR=/opt/hermes

# Set these at Railway runtime:
#   HERMES_HOME            e.g. /opt/data  (must match the volume mount path)
#   HERMES_WEBUI_PASSWORD  required — anyone who reaches port 8787 can run commands

EXPOSE 8787

ENTRYPOINT []

# main-wrapper.sh (the ENTRYPOINT script) activates /opt/hermes/.venv before
# routing, so `python` resolves to the venv Python automatically.
CMD ["sh", "-lc", "export HERMES_WEBUI_PORT=\"${PORT:-8787}\"; cd /opt/hermes-webui && /opt/hermes/.venv/bin/python server.py & exec /opt/hermes/bin/hermes gateway run"]
