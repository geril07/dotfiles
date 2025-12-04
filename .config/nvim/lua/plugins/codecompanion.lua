return {
	{
		"olimorris/codecompanion.nvim",
		event = "VeryLazy",
		enabled = false,
		dependencies = {
			"nvim-lua/plenary.nvim",
			"nvim-treesitter/nvim-treesitter",
			"franco-ruggeri/codecompanion-spinner.nvim",

			{
				"ravitemer/mcphub.nvim",
				build = "npm install -g mcp-hub@latest",
				enabled = false,
				opts = {
					builtin_tools = {
						edit_file = {
							parser = {
								track_issues = true, -- Track parsing issues for LLM feedback
								extract_inline_content = true, -- Handle content on marker lines
							},
							locator = {
								fuzzy_threshold = 0.8, -- Minimum similarity for fuzzy matches (0.0-1.0)
								enable_fuzzy_matching = true, -- Allow fuzzy matching when exact fails
							},
							ui = {
								go_to_origin_on_complete = true, -- Jump back to original file on completion
								keybindings = {
									accept = ".", -- Accept current change
									reject = ",", -- Reject current change
									next = "n", -- Next diff
									prev = "p", -- Previous diff
									accept_all = "ga", -- Accept all remaining changes
									reject_all = "gr", -- Reject all remaining changes
								},
							},
							feedback = {
								include_parser_feedback = true, -- Include parsing feedback for LLM
								include_locator_feedback = true, -- Include location feedback for LLM
								include_ui_summary = true, -- Include UI interaction summary
								ui = {
									include_session_summary = true, -- Include session summary in feedback
									include_final_diff = true, -- Include final diff in feedback
									send_diagnostics = true, -- Include diagnostics after editing
									wait_for_diagnostics = 500, -- Wait time for diagnostics (ms)
									diagnostic_severity = vim.diagnostic.severity.WARN, -- Min severity to include
								},
							},
						},
					},
				},
			},
		},
		config = function()
			require("codecompanion").setup({
				opts = {
					log_level = "DEBUG", -- TRACE|DEBUG|ERROR|INFO
				},

				memory = {
					opts = {
						chat = {
							enabled = true,
						},
					},
				},

				strategies = {
					chat = {
						adapter = "openrouter",

						keymaps = {
							clear = {
								modes = { n = "gX" },
								description = "Clear chat",
							},
						},
					},
					inline = {
						adapter = "gemini",
					},
					cmd = {
						adapter = "gemini",
					},
				},

				adapters = {
					http = {
						gemini = function()
							return require("codecompanion.adapters").extend("gemini", {
								env = {
									api_key = "GEMINI_API_KEY",
									-- api_key = "cmd: gpg --batch --quiet --decrypt ~/secrets/GEMINI_API_KEY.gpg",
								},
							})
						end,

						openai = function()
							return require("codecompanion.adapters").extend("openai", {
								env = {
									api_key = "OPENAI_API_KEY",
								},
							})
						end,

						openrouter = function()
							return require("codecompanion.adapters").extend("openai_compatible", {
								name = "openrouter",
								formatted_name = "OpenRouter",
								env = {
									api_key = "OPENROUTER_API_KEY",
									url = "https://openrouter.ai/api",
									chat_url = "/v1/chat/completions",
								},
								schema = {
									model = {
										default = "x-ai/grok-code-fast-1",
										choices = require("my.ai.openrouter").openrouter_models,
									},
								},
							})
						end,
					},
				},

				extensions = {
					spinner = {},

					mcphub = {
						callback = "mcphub.extensions.codecompanion",
						enabled = false,
						opts = {
							-- MCP Tools
							make_tools = true, -- Make individual tools (@server__tool) and server groups (@server) from MCP servers
							show_server_tools_in_chat = true, -- Show individual tools in chat completion (when make_tools=true)
							add_mcp_prefix_to_tool_names = false, -- Add mcp__ prefix (e.g `@mcp__github`, `@mcp__neovim__list_issues`)
							show_result_in_chat = true, -- Show tool results directly in chat buffer
							-- MCP Resources
							make_vars = true, -- Convert MCP resources to #variables for prompts
							-- MCP Prompts
							make_slash_commands = true, -- Add MCP prompts as /slash commands
						},
					},
				},
			})

			vim.cmd([[cab ccc CodeCompanion]])
			vim.cmd([[cab cca CodeCompanionActions]])
			vim.cmd([[cab ccmd CodeCompanionCmd]])
			vim.cmd([[cab cc CodeCompanionChat]])
		end,
	},
}
