local is_blink_dev = false

return {
  {
    "saghen/blink.cmp",
    dependencies = { "LuaSnip" },
    build = "cargo +nightly build --release",
    dev = is_blink_dev,
    event = "InsertEnter",
    -- tag = "v1.10.1",
    enabled = true,
    opts = function()
      -- cmp.snippet_active but without is_hidden_snippet()
      -- https://github.com/Saghen/blink.cmp/blob/a1b5c1a47b65630010bf030c2b5a6fdb505b0cbb/lua/blink/cmp/config/snippets.lua#L45
      local snippet_active = function(filter)
        local ls = require("luasnip")
        if filter and filter.direction then
          return ls.jumpable(filter.direction)
        end
        return ls.in_snippet()
      end

      return {
        enabled = function()
          return not vim.tbl_contains({ "DressingInput" }, vim.bo.filetype)
        end,

        keymap = {
          preset = "none",

          ["<C-Space>"] = {
            "cancel",
            "show",
            "fallback",
          },

          ["<Tab>"] = {
            function(cmp)
              if cmp.is_visible() then
                return cmp.accept()
              end

              if snippet_active({ direction = 1 }) then
                return cmp.snippet_forward()
              end
            end,
            "fallback",
          },
          ["<S-TAB>"] = { "snippet_backward", "fallback" },

          ["<CR>"] = { "accept", "fallback" },
          ["<C-n>"] = {
            function(cmp)
              if cmp.is_visible() then
                return cmp.select_next()
              end

              return cmp.show()
            end,
            "fallback",
          },
          ["<C-p>"] = {
            function(cmp)
              if cmp.is_visible() then
                return cmp.select_prev()
              end

              return cmp.show()
            end,
            "fallback",
          },
          ["<C-k>"] = { "scroll_documentation_up", "fallback" },
          ["<C-j>"] = { "scroll_documentation_down", "fallback" },
        },
        completion = {
          trigger = {
            show_on_blocked_trigger_characters = { " ", "\n", "\t", "{", "}", "!" },
            show_on_insert_on_trigger_character = false,
          },

          menu = {
            border = "single",
            min_width = 30,
            auto_show = true,

            draw = {
              align_to = "cursor",

              padding = 1,
              columns = {
                { "kind_icon" },
                { "label", "label_description", gap = 1 },
              },
              components = {
                kind_icon = {
                  text = function(ctx)
                    return ctx.kind_icon .. ctx.icon_gap .. " "
                  end,
                },
              },
            },
          },

          accept = {
            resolve_timeout_ms = 50,

            -- neovide cursor flicker
            dot_repeat = true,

            auto_brackets = {
              enabled = false,
            },
          },

          list = {
            selection = { preselect = true, auto_insert = false },
            max_items = 100,
          },

          documentation = {
            auto_show = true,
            auto_show_delay_ms = 150,

            window = {
              border = "single",
            },
          },
        },

        appearance = {
          kind_icons = require("my.icons").symbol_kinds,
        },

        fuzzy = {
          prebuilt_binaries = { ignore_version_mismatch = true },
          use_frecency = not is_blink_dev,

          -- max_typos = 1,
          sorts = {
            "exact",
            "score",
            "sort_text",
            -- "label_shorter_first",
            -- shorter first, will have to use lua sort!
            -- function(a, b)
            -- 	return #a.label < #b.label
            -- end,
            "label",
          },
        },

        snippets = {
          preset = "luasnip",
        },

        -- signature = { enabled = true },
        -- Disable command line completion:
        cmdline = { enabled = false },

        sources = {
          default = { "lsp", "path", "snippets", "buffer" },

          providers = {
            path = {
              score_offset = 0,
            },

            lsp = {
              fallbacks = {},
              timeout_ms = 300,
              transform_items = function(ctx, items)
                local function client_exists(bufnr, name)
                  for _, client in ipairs(vim.lsp.get_clients({ bufnr = bufnr })) do
                    if client.name == name then
                      return true
                    end
                  end
                  return false
                end

                local function filter_emmet_if_outside_elements(ctx2, items2)
                  local bufnr = ctx2.bufnr
                  local lsp_name = "emmet_language_server"
                  if not client_exists(bufnr, lsp_name) then
                    return items2
                  end

                  local ft = vim.bo[bufnr].filetype
                  local embedded_fts = { "vue", "typescriptreact", "javascriptreact", "svelte" }
                  if not vim.tbl_contains(embedded_fts, ft) then
                    return items2
                  end

                  local ts_utils = require("nvim-treesitter.ts_utils")
                  local node = ts_utils.get_node_at_cursor()
                  local emmet_nodes = { "jsx_element", "template_element", "style_element" }
                  local not_emmet_nodes = { "script_element" }

                  while node do
                    local t = node:type()
                    if vim.tbl_contains(emmet_nodes, t) then
                      return items2
                    elseif vim.tbl_contains(not_emmet_nodes, t) then
                      break
                    end
                    node = node:parent()
                  end

                  return vim.tbl_filter(function(item)
                    return item.client_name ~= lsp_name
                  end, items2)
                end

                local function penalize_radix_ui(ctx2, items2)
                  local bufnr = ctx2.bufnr
                  local lsp_name = "vtsls"
                  if not client_exists(bufnr, lsp_name) then
                    return items2
                  end

                  local ft = vim.bo[bufnr].filetype
                  if vim.tbl_contains({ "typescriptreact", "javascriptreact" }, ft) then
                    for _, item in ipairs(items2) do
                      local desc = item.labelDetails and item.labelDetails.description
                      if desc and desc:find("^@radix%-ui/react") then
                        item.score_offset = -1
                      end
                    end
                  end
                  return items2
                end

                local function strip_zls_parentheses(ctx2, items2)
                  local bufnr = ctx2.bufnr
                  local lsp_name = "zls"
                  if not client_exists(bufnr, lsp_name) then
                    return items2
                  end

                  for _, item in ipairs(items2) do
                    if item.client_name == lsp_name then
                      local stripped = item.label:match("^(.-)%s*%(")
                      if stripped then
                        item.label = stripped
                      end
                    end
                  end

                  return items2
                end

                local transforms = {
                  filter_emmet_if_outside_elements,
                  penalize_radix_ui,
                  -- strip_zls_parentheses,
                }

                local result = items
                for _, transform in ipairs(transforms) do
                  local ok, new_result = pcall(transform, ctx, result)
                  if ok then
                    result = new_result
                  else
                    print("transform failed:", new_result)
                  end
                end

                return result
              end,
            },
          },
        },
      }
    end,
  },

  {
    "geril2207/magazine.nvim",
    name = "nvim-cmp",
    dev = false,
    enabled = false,
    branch = "docs-view-ts",
    event = "InsertEnter",
    opts = function()
      local luasnip = require("luasnip")

      local cmp = require("cmp")

      local function toggle_completion_menu()
        if cmp.visible() then
          cmp.close()
        else
          cmp.complete()
        end
      end

      local cmp_select = { behavior = cmp.SelectBehavior.Select }
      local confirm_options = {
        behavior = cmp.ConfirmBehavior.Insert,
        select = false,
      }

      return {
        preselect = cmp.PreselectMode.None,
        completion = {
          completeopt = "menu,menuone,noinsert",
        },
        snippet = {
          expand = function(args)
            luasnip.lsp_expand(args.body)
          end,
        },
        mapping = cmp.mapping.preset.insert({
          ["<C-p>"] = function()
            if cmp.visible() then
              cmp.select_prev_item(cmp_select)
            else
              cmp.complete()
            end
          end,
          ["<C-n>"] = function()
            if cmp.visible() then
              cmp.select_next_item(cmp_select)
            else
              cmp.complete()
            end
          end,
          ["<C-k>"] = cmp.mapping.scroll_docs(-4),
          ["<C-j>"] = cmp.mapping.scroll_docs(4),
          ["<C-Space>"] = cmp.mapping(toggle_completion_menu, { "i", "c" }),
          ["<C-s>"] = cmp.mapping(toggle_completion_menu, { "i", "c" }),
          ["<CR>"] = cmp.mapping.confirm(confirm_options),
          ["<Tab>"] = cmp.mapping(function(fallback)
            if cmp.visible() and cmp.get_selected_entry() then
              cmp.confirm(confirm_options)
            elseif luasnip.jumpable(1) then
              luasnip.jump(1)
            elseif luasnip.expandable() then
              luasnip.expand()
            else
              fallback()
            end
          end, { "i", "s" }),
          ["<S-Tab>"] = cmp.mapping(function(fallback)
            if luasnip.jumpable(-1) then
              luasnip.jump(-1)
            elseif cmp.visible() then
              cmp.select_prev_item()
            else
              fallback()
            end
          end, { "i", "s" }),
        }),
        formatting = {
          fields = { "kind", "abbr", "menu" },
          format = function(_, vim_item)
            local MAX_ABBR_WIDTH, MAX_MENU_WIDTH = 40, 20
            local ellipsis = require("my.icons").misc.ellipsis
            local symbol_kinds = require("my.icons").symbol_kinds

            -- Add the icon.
            vim_item.kind = (symbol_kinds[vim_item.kind] or symbol_kinds.Text)

            -- Truncate the label.
            if vim.api.nvim_strwidth(vim_item.abbr) > MAX_ABBR_WIDTH then
              vim_item.abbr = vim.fn.strcharpart(vim_item.abbr, 0, MAX_ABBR_WIDTH) .. ellipsis
            end

            -- Truncate the description part.
            if vim.api.nvim_strwidth(vim_item.menu or "") > MAX_MENU_WIDTH then
              vim_item.menu = vim.fn.strcharpart(vim_item.menu, 0, MAX_MENU_WIDTH) .. ellipsis
            end

            return vim_item
          end,
        },
        sources = cmp.config.sources({
          { name = "nvim_lsp" },
          { name = "luasnip" },
          { name = "async_path" },
        }, {
          { name = "buffer", keyword_length = 3 },
        }),
        sorting = {
          comparators = {
            cmp.config.compare.exact,
            cmp.config.compare.score,
            cmp.config.compare.offset,
            cmp.config.compare.length,
            cmp.config.compare.locality,

            -- copied from cmp-under, but I don't think I need the plugin for this.
            -- I might add some more of my own.
            function(entry1, entry2)
              local _, entry1_under = entry1.completion_item.label:find("^_+")
              local _, entry2_under = entry2.completion_item.label:find("^_+")
              entry1_under = entry1_under or 0
              entry2_under = entry2_under or 0
              if entry1_under > entry2_under then
                return false
              elseif entry1_under < entry2_under then
                return true
              end
            end,

            cmp.config.compare.kind,
            cmp.config.compare.sort_text,
            cmp.config.compare.order,
          },
        },
        performance = {
          max_view_entries = 25,
        },
      }
    end,
    dependencies = {
      { "iguanacucumber/mag-nvim-lsp", name = "cmp-nvim-lsp", opts = {} },
      { "iguanacucumber/mag-buffer", name = "cmp-buffer" },
      { "https://codeberg.org/FelipeLema/cmp-async-path", name = "async_path" },
      "saadparwaiz1/cmp_luasnip",
      "L3MON4D3/LuaSnip",
    },
  },
}
