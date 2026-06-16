FROM nousresearch/hermes-agent:main

USER root

# Only git is needed — the agent image already has python3 and its own venv
RUN apt-get update && apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

# Clone hermes-webui
RUN git clone https://github.com/nesquena/hermes-webui.git /opt/hermes-webui

# Install the webui's two hard deps into the agent's existing venv at /opt/hermes/.venv.
# The venv already has all hermes-agent Python deps, so `from run_agent import AIAgent`
# works without any additional install step at startup.
RUN /opt/hermes/.venv/bin/pip install --quiet --no-cache-dir \
    "pyyaml>=6.0" "cryptography>=42.0"

# Bind all interfaces (required for Railway's port routing)
ENV HERMES_WEBUI_HOST=0.0.0.0
ENV HERMES_WEBUI_PORT=8787

# run_agent.py lives at /opt/hermes/run_agent.py — added to sys.path by api/config.py
ENV HERMES_WEBUI_AGENT_DIR=/opt/hermes

# Set these at Railway runtime:
#   HERMES_HOME            e.g. /opt/data  (must match the volume mount path)
#   HERMES_WEBUI_PASSWORD  required — anyone who reaches port 8787 can run commands

EXPOSE 8787

# No CMD override — the Railway start command drives process startup.
# main-wrapper.sh (the ENTRYPOINT script) activates /opt/hermes/.venv before
# routing, so `python` resolves to the venv Python automatically.
# Set this as the start command in Railway:
#   sh -lc 'cd /opt/hermes-webui && python server.py & exec /opt/hermes/bin/hermes gateway run'
