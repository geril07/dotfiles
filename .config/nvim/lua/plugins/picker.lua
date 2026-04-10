local map_utils = require("my.utils.map")
local mcmd = map_utils.cmd
return {
  {
    "ibhagwan/fzf-lua",
    -- optional for icon support
    dependencies = { "nvim-tree/nvim-web-devicons" },
    cmd = "FzfLua",
    event = "VeryLazy",
    dev = false,
    enabled = true,
    opts = function()
      local actions = require("fzf-lua.actions")
      -- vim.env.FZF_DEFAULT_OPTS = ""

      require("fzf-lua").register_ui_select({

        winopts = {
          width = 0.5,
          height = 0.4,
          row = 0.50, -- window row position (0=top, 1=bottom)
          col = 0.50, -- window col position (0=left, 1=right)
        },
      })

      return {
        { "hide", "border-fused" },
        fzf_opts = {},
        -- fzf_colors = {
        -- 	["hl"] = { "fg", "TelescopeMatching", "reverse" },
        -- 	["hl+"] = { "fg", "TelescopeMatching", "reverse" },
        -- },

        defaults = {
          formatter = "path.dirname_first",
        },

        winopts = {
          title = "",
          height = 0.85, -- window height
          width = 0.80, -- window width
          row = 0.50, -- window row position (0=top, 1=bottom)
          col = 0.50, -- window col position (0=left, 1=right)
          preview = {
            scrollbar = false,
            layout = "vertical",
            vertical = "down:50%",
            hidden = true,
          },
          treesitter = false,

          -- on_create = function()
          -- 	local tree_api = require("nvim-tree.api")
          -- 	local tree_utils = require("my.nvim-tree.utils")
          --
          -- 	if tree_utils.is_floating() then
          -- 		tree_api.tree.close()
          -- 	end
          -- end,
        },

        actions = {
          files = {
            true,
            ["enter"] = actions.file_switch_or_edit,
            -- ["enter"] = actions.file_edit_or_qf,
            ["alt-h"] = actions.toggle_hidden,
            ["alt-s"] = actions.file_split,
            ["alt-v"] = actions.file_vsplit,
          },
        },

        keymap = {

          builtin = {
            false,

            ["<M-Esc>"] = "hide", -- hide fzf-lua, `:FzfLua resume` to continue
            ["<M-p>"] = "toggle-preview",
            ["<M-f>"] = "toggle-fullscreen",
            ["<C-j>"] = "preview-half-page-down",
            ["<C-k>"] = "preview-half-page-up",
            ["<C-l>"] = "preview-half-page-left",
            ["<C-h>"] = "preview-half-page-right",
            ["<A-z>"] = "toggle-preview-wrap",
          },

          fzf = {
            false,
          },
        },

        lines = {},
        blines = {},
        files = {
          winopts = { preview = { hidden = false, delay = 100 } },
          cwd_prompt = false,
          fzf_opts = { ["--tiebreak"] = "length" },
        },

        oldfiles = {
          cwd_only = true,
        },

        lsp = {
          includeDeclaration = false,
          winopts = { preview = { hidden = false } },

          symbols = {
            winopts = { preview = { hidden = false } },
            symbol_icons = require("my.icons").symbol_kinds,
          },
        },

        diagnostics = {
          multiline = 1,
        },

        helptags = {
          actions = {
            ["alt-s"] = actions.help,
            ["alt-v"] = actions.help_vert,
          },
        },
      }
    end,
    keys = map_utils.wrap_into_silent({
      { "<leader>ffl", mcmd("FzfLua lines") },
      { "<leader>ffb", mcmd("FzfLua blines") },
      { "<leader>p", mcmd("FzfLua files") },
      { "<C-p>", mcmd("FzfLua files") },
      { "<leader>P", mcmd("FzfLua") },
      { "<leader>fp", mcmd("FzfLua resume") },
      { "<leader>fz", mcmd("FzfLua live_grep") },
      { "<leader>fz", mcmd("FzfLua grep_visual"), mode = "v" },
      { "<leader>fx", mcmd("FzfLua grep") },
      { "<leader>fl", mcmd("FzfLua grep_cword") },
      { "<leader>fgb", mcmd("FzfLua grep_curbuf") },
      { "<leader>fb", mcmd("FzfLua buffers") },
      { "<leader>fr", mcmd("FzfLua oldfiles") },
      { "<leader>fg", mcmd("FzfLua git_files") },
      { "<leader>fm", mcmd("FzfLua marks") },
      { "<leader>fs", mcmd("FzfLua lsp_document_symbols") },
      { "<leader>fw", mcmd("FzfLua lsp_live_workspace_symbols") },
      { "gf", mcmd("FzfLua lsp_references") },
      { "gt", mcmd("FzfLua lsp_typedefs") },
      { "<leader>fd", mcmd("FzfLua lsp_workspace_diagnostics") },
      { "<leader>d", mcmd("FzfLua lsp_definitions") },
      { "gd", mcmd("FzfLua lsp_definitions") },
    }),
  },
  {
    "nvim-telescope/telescope.nvim",
    dev = false,
    enabled = false,
    dependencies = {
      "nvim-lua/plenary.nvim",
      {
        "nvim-telescope/telescope-fzf-native.nvim",
        build = "make",
      },
    },
    cmd = "Telescope",
    config = function()
      local actions = require("telescope.actions")
      local action_layout = require("telescope.actions.layout")

      require("telescope").setup({
        defaults = {
          sorting_strategy = "ascending",

          layout_strategy = "vertical",
          layout_config = {
            vertical = {
              preview_cutoff = 1,
              prompt_position = "top",
              mirror = true,
            },
          },
          -- layout_config = {
          -- 	horizontal = {
          -- 		prompt_position = "top",
          -- 	},
          -- },
          mappings = {
            i = {
              ["<ESC>"] = actions.close,
              ["<M-p>"] = action_layout.toggle_preview,
              ["<M-k>"] = actions.cycle_history_prev,
              ["<M-j>"] = actions.cycle_history_next,
              ["<C-j>"] = actions.preview_scrolling_down,
              ["<C-k>"] = actions.preview_scrolling_up,
              ["<C-l>"] = actions.preview_scrolling_right,
              ["<C-h>"] = actions.preview_scrolling_left,
              ["<M-s>"] = actions.select_horizontal,
              ["<M-v>"] = actions.select_vertical,
              ["<C-u>"] = false,
            },
            n = {
              ["q"] = actions.close,
              ["o"] = actions.select_default,
            },
          },
          file_ignore_patterns = {
            "^.pnpm-store",
            "build/",
            "dist/",
            "node_modules/",
            "^.next",
            "^.git",
            ".png",
            ".svg",
            ".jpg",
            ".mp3",
            ".jpeg",
            ".ttf",
            ".eoff",
            ".otf",
            ".woff2",
            ".woff",
            ".eot",
            ".gif",
            ".tsbuildinfo",
          },
          path_display = { "truncate" },
        },
        pickers = {
          find_files = {
            hidden = true,
            no_ignore = false,
            find_command = vim.fn.executable("fd") == 1
                and { "fd", "--type", "f", "--path-separator", "/", "-E", '".git"' }
              or nil,
            previewer = true,

            sorting_strategy = "ascending",
          },

          live_grep = {
            -- additional_args = function()
            -- 	return { "--hidden" }
          },
          lsp_implementations = {
            initial_mode = "normal",
            layout_config = {
              preview_width = 80,
              mirror = true,
              width = 0.7,
            },
          },
          lsp_definitions = {
            show_line = true,
            path_display = { "tail" },
            file_ignore_patterns = {},
          },
          lsp_references = {
            previewer = false,
            show_line = true,
            path_display = { "tail" },
            file_ignore_patterns = {},
          },
        },
        extensions = {
          fzf = {
            fuzzy = true, -- false will only do exact matching
            override_generic_sorter = true, -- override the generic sorter
            override_file_sorter = true, -- override the file sorter
            case_mode = "smart_case", -- or "ignore_case" or "respect_case"
            -- the default case_mode is "smart_case"
          },
        },
      })

      require("telescope").load_extension("fzf")

      local tree_api = require("nvim-tree.api")
      local tree_runtime = require("my.nvim-tree.runtime")
      local api = vim.api

      api.nvim_create_autocmd("User", {
        pattern = "TelescopeFindPre",
        callback = function()
          if tree_runtime.is_floating() then
            tree_api.tree.close()
          end
        end,
      })
    end,

    keys = map_utils.wrap_into_silent({
      { "<leader>snp", mcmd("Telescope neoclip plus") },
      { "<leader>sn", mcmd("Telescope neoclip") },
      { "<leader>snu", mcmd("Telescope neoclip unnamed") },
      { "<leader>sns", mcmd("Telescope neoclip star") },
      { "<leader>ff", mcmd("Telescope find_files") },
      { "<leader>p", mcmd("Telescope find_files") },
      { "<leader>P", mcmd("Telescope") },
      { "<leader>fp", mcmd("Telescope resume") },
      { "<C-p>", mcmd("Telescope find_files") },
      { "<leader>fz", mcmd("Telescope live_grep") },
      {
        "<leader>fx",
        function()
          require("telescope.builtin").grep_string({
            search = vim.fn.input("Grep: "),
          })
        end,
      },
      { "<leader>fl", mcmd("Telescope grep_string") },
      { "<leader>fb", mcmd("Telescope buffers") },
      { "<leader>fg", mcmd("Telescope git_files") },
      { "<leader>u", mcmd("Telescope undo") },
      { "<leader>fh", mcmd("Telescope harpoon marks initial_mode=normal") },
      { "<leader>fm", mcmd("Telescope marks") },
      { "<leader>fs", mcmd("Telescope lsp_document_symbols") },
      { "<leader>fw", mcmd("Telescope lsp_dynamic_workspace_symbols") },
      { "gf", mcmd("Telescope lsp_references") },
      { "gt", mcmd("Telescope lsp_type_definitions") },
      { "<leader>fd", mcmd("Telescope diagnostics ") },

      { "<leader>d", mcmd("Telescope lsp_definitions") },
      { "gd", mcmd("Telescope lsp_definitions") },

      { "gi", mcmd("Telescope lsp_implementations") },
    }),
  },
}
