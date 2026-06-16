FROM nousresearch/hermes-agent:main

USER root

# git to clone webui; python3 + venv for the webui process
RUN apt-get update && apt-get install -y --no-install-recommends \
    git python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Clone hermes-webui (update the commit hash to pull a newer release)
RUN git clone https://github.com/nesquena/hermes-webui.git /opt/hermes-webui

# Dedicated venv for the webui process so it never touches the agent's venv.
# Pre-install webui hard deps + all hermes-agent deps so `from run_agent import AIAgent`
# works without hitting the network at container startup.
RUN python3 -m venv /opt/hermes-webui/.venv && \
    /opt/hermes-webui/.venv/bin/pip install --quiet --no-cache-dir \
        "pyyaml>=6.0" "cryptography>=42.0" && \
    /opt/hermes-webui/.venv/bin/pip install --quiet --no-cache-dir \
        -r /opt/hermes/requirements.txt

# Bind all interfaces (required for Railway's port routing)
ENV HERMES_WEBUI_HOST=0.0.0.0
ENV HERMES_WEBUI_PORT=8787

# Tell webui where to find run_agent.py (added to sys.path by api/config.py)
ENV HERMES_WEBUI_AGENT_DIR=/opt/hermes

# Set these at Railway runtime — not hardcoded here so the Dockerfile is portable:
#   HERMES_HOME              e.g. /opt/data  (must match the volume mount path)
#   HERMES_WEBUI_STATE_DIR   e.g. /opt/data/webui
#   HERMES_WEBUI_PASSWORD    required — anyone who reaches port 8787 can run commands

EXPOSE 8787

# Run the hermes gateway + the webui side-by-side in one container.
# The CMD is used when no start command override is set in Railway.
CMD ["sh", "-lc", "cd /opt/hermes-webui && .venv/bin/python server.py & exec /opt/hermes/bin/hermes gateway run"]
