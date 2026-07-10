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

# Never derive this from $PORT: the service sets PORT=9119 for the dashboard,
# which would land webui on the dashboard's port.
ENV HERMES_WEBUI_PORT=8787

# run_agent.py lives at /opt/hermes/run_agent.py — added to sys.path by api/config.py
ENV HERMES_WEBUI_AGENT_DIR=/opt/hermes

# Set these at Railway runtime:
#   HERMES_HOME            e.g. /opt/data  (must match the volume mount path)
#   HERMES_WEBUI_PASSWORD  required — anyone who reaches port 8787 can run commands
#   HERMES_WEBUI_STATE_DIR e.g. /opt/data/webui. Clearing ENTRYPOINT skips
#                          main-wrapper.sh, which is what exported HOME=/opt/data,
#                          so webui would otherwise put state under /root and lose
#                          it on every redeploy.

EXPOSE 8787
EXPOSE 9119

# Clearing the base image's ENTRYPOINT bypasses s6-overlay and main-wrapper.sh.
# That costs us venv activation, the privilege drop to the `hermes` user, and
# process supervision — so every binary below is called by absolute path, and
# `sh -c` (not `-lc`) keeps /etc/profile from overwriting PATH.
ENTRYPOINT []

# Three processes: webui (8787) and the native dashboard (9119) in the
# background, gateway (8642) in the foreground so its exit code is the
# container's. A backgrounded process that dies leaves the container up, so a
# green deploy alone does not prove webui and the dashboard are listening.
#
# The dashboard subshell mirrors docker/s6-rc.d/dashboard/run from the base
# image, which no longer runs here because ENTRYPOINT is cleared: HOME must be
# /opt/data or dashboard state anchors under /root and is lost on redeploy.
# No --insecure: since the June 2026 hardening it is accepted but ignored, and
# a non-loopback bind fails closed unless HERMES_DASHBOARD_BASIC_AUTH_USERNAME
# and _PASSWORD (or _OAUTH_CLIENT_ID) register an auth provider.
CMD ["sh", "-c", "cd /opt/hermes-webui && /opt/hermes/.venv/bin/python server.py & (export HOME=/opt/data; cd /opt/data; exec /opt/hermes/bin/hermes dashboard --host \"${HERMES_DASHBOARD_HOST:-0.0.0.0}\" --port \"${HERMES_DASHBOARD_PORT:-9119}\" --no-open) & exec /opt/hermes/bin/hermes gateway run"]
