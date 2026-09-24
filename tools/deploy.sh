#!/usr/bin/env bash
#
# Publish the portfolio to GitHub Pages on tamif.is-a.dev.
#
# Idempotent: safe to re-run. Every step checks first and skips work already
# done, so it can be resumed after an interruption or a permissions fix.
#
# Requires a token with:
#   administration=write, repository_creation=write   (create + configure repo)
#   pages=write                                       (enable Pages)
#   contents=write, pull_requests=write               (push + open is-a.dev PR)
#
# Usage:  GITHUB_TOKEN=... ./tools/deploy.sh
#
set -uo pipefail

OWNER="dontman-tech"
REPO="portfolio"
BRANCH="main"
DOMAIN="tamif.is-a.dev"
PAGES_HOST="${OWNER}.github.io"
SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="https://api.github.com"

: "${GITHUB_TOKEN:?GITHUB_TOKEN must be set}"

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
skip() { printf '  \033[33m•\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

api() {
  local method="$1" path="$2" data="${3:-}"
  if [ -n "$data" ]; then
    curl -sS -X "$method" -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" \
      "${API}${path}" -d "$data"
  else
    curl -sS -X "$method" -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" \
      "${API}${path}"
  fi
}
# HTTP status only, for existence checks.
status() {
  curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" "${API}$1"
}
jget() { python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('$1','') or '')" 2>/dev/null; }

# ---------------------------------------------------------------- preflight
step "0. Preflight"
if [ "$(status /user)" != "200" ]; then
  fail "token cannot read /user — check GITHUB_TOKEN"; exit 1
fi
pass "token authenticates"

pass "preflight done"

# ------------------------------------------------------------------- repo
step "1. Repository ${OWNER}/${REPO}"
if [ "$(status "/repos/${OWNER}/${REPO}")" = "200" ]; then
  skip "already exists"
else
  RESP=$(api POST /user/repos "{\"name\":\"${REPO}\",\"description\":\"Developer portfolio for Tabe Miracle Fiagmenyi — full-stack & applied AI engineer. Static site, no build step.\",\"homepage\":\"https://${DOMAIN}\",\"private\":false,\"has_wiki\":false,\"has_projects\":false}")
  if [ -n "$(jget message <<<"$RESP")" ] && [ "$(jget message <<<"$RESP")" != "" ]; then
    fail "could not create repo: $(jget message <<<"$RESP")"
    fail "the token needs repository_creation=write"
    exit 1
  fi
  pass "created"
fi

# ------------------------------------------------------------------- push
step "2. Push ${BRANCH}"
cd "$SITE_DIR" || exit 1
git remote remove origin 2>/dev/null || true
git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${OWNER}/${REPO}.git"
if git push -u origin "${BRANCH}" 2>&1 | tail -3; then
  pass "pushed (or already up to date)"
else
  fail "push failed"; exit 1
fi

# ------------------------------------------------------------------ pages
step "3. GitHub Pages"
if [ "$(status "/repos/${OWNER}/${REPO}/pages")" = "200" ]; then
  skip "already enabled"
else
  RESP=$(api POST "/repos/${OWNER}/${REPO}/pages" "{\"source\":{\"branch\":\"${BRANCH}\",\"path\":\"/\"}}")
  MSG=$(jget message <<<"$RESP")
  if [ -n "$MSG" ]; then
    fail "could not enable Pages: ${MSG}"
    fail "the token needs pages=write"
    exit 1
  fi
  pass "enabled from ${BRANCH} /"
fi

# Custom domain is also committed as the CNAME file, but set it here too so
# GitHub provisions the certificate immediately.
RESP=$(api PUT "/repos/${OWNER}/${REPO}/pages" "{\"cname\":\"${DOMAIN}\",\"https_enforced\":true}")
pass "custom domain set to ${DOMAIN}"

# --------------------------------------------------------------- is-a.dev
step "4. is-a.dev registration"
if [ "$(status "/repos/${OWNER}/register")" = "200" ]; then
  FORK_OWNER="$OWNER"
  skip "using existing fork ${OWNER}/register"
else
  RESP=$(api POST /repos/is-a-dev/register/forks)
  MSG=$(jget message <<<"$RESP")
  if [ -n "$MSG" ]; then
    fail "could not fork is-a-dev/register: ${MSG}"; exit 1
  fi
  FORK_OWNER="$(jget full_name <<<"$RESP" | cut -d/ -f1)"
  pass "forked to ${FORK_OWNER}/register"
  sleep 5
fi

WORK=$(mktemp -d)
git clone --depth 1 "https://x-access-token:${GITHUB_TOKEN}@github.com/${FORK_OWNER}/register.git" "$WORK/register" 2>&1 | tail -1
mkdir -p "$WORK/register/domains"
cp "$SITE_DIR/tools/is-a-dev/tamif.json" "$WORK/register/domains/tamif.json"
cd "$WORK/register" || exit 1
git checkout -b add-tamif 2>/dev/null || git checkout add-tamif
git -c user.name="Tabe Miracle Fiagmenyi" -c user.email="tabe7143@gmail.com" add domains/tamif.json
git -c user.name="Tabe Miracle Fiagmenyi" -c user.email="tabe7143@gmail.com" commit -q -m "Add tamif.is-a.dev" || skip "nothing new to commit"
git push -u "https://x-access-token:${GITHUB_TOKEN}@github.com/${FORK_OWNER}/register.git" add-tamif --force 2>&1 | tail -2

PR=$(api POST "/repos/is-a-dev/register/pulls" "{\"title\":\"Add tamif.is-a.dev\",\"head\":\"${FORK_OWNER}:add-tamif\",\"base\":\"main\",\"body\":\"## Subdomain\\n\\n\`${DOMAIN}\`\\n\\n## Domain file\\n\\n\`domains/tamif.json\`\\n\\n## Owner\\n\\n- GitHub: [@${OWNER}](https://github.com/${OWNER})\\n- Email: tabe7143@gmail.com\\n\\n## Site\\n\\nPersonal developer portfolio, served from GitHub Pages at \`${PAGES_HOST}/${REPO}\`. The CNAME points at the organisation's Pages host so \`${DOMAIN}\` resolves to it.\\n\\nThe site is static HTML/CSS/JS with no build step; \`CNAME\` and \`.nojekyll\` are committed in the repo.\\n\\n---\\nThis pull request was created by an AI agent (OpenHands) on behalf of @${OWNER}.\"}")
PRURL=$(jget html_url <<<"$PR")
if [ -z "$PRURL" ]; then
  fail "could not open PR: $(jget message <<<"$PR")"
  fail "open it manually from the pushed branch add-tamif"
else
  pass "PR opened: ${PRURL}"
fi

# ------------------------------------------------------------------- done
step "Done"
echo "  Site:      https://${DOMAIN}/"
echo "  Pages:     https://${PAGES_HOST}/${REPO}/"
echo "  Repo:      https://github.com/${OWNER}/${REPO}"
echo
echo "  Next: after the is-a.dev PR is merged, GitHub verifies the domain"
echo "  automatically. If asked, add the TXT verification string at"
echo "  Settings > Pages > Add a domain."
