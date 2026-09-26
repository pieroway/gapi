# Optional GNU Make aliases; all behavior lives in the repository scripts.
.DEFAULT_GOAL := help
COMMANDS := quality-gate test-audit test-static setup dev stop build package verify-deploy test test-visual test-visual-update test-accessibility test-unit test-tooling test-docker test-api test-integration test-load setup-browsers test-e2e test-iphone test-devices test-staging help
.PHONY: $(COMMANDS)
$(COMMANDS):
	node scripts/gapi.mjs $@
