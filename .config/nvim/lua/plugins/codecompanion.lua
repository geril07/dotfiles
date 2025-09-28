return {
	{
		"olimorris/codecompanion.nvim",
		event = "VeryLazy",
		dependencies = {
			"nvim-lua/plenary.nvim",
			"nvim-treesitter/nvim-treesitter",
			"franco-ruggeri/codecompanion-spinner.nvim",
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
				},
			})

			vim.cmd([[cab ccc CodeCompanion]])
			vim.cmd([[cab cca CodeCompanionActions]])
			vim.cmd([[cab ccmd CodeCompanionCmd]])
			vim.cmd([[cab cc CodeCompanionChat]])
		end,
	},
}
