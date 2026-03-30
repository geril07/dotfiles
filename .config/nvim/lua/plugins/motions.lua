local map_utils = require("my.utils.map")
local mcmd = map_utils.cmd
local double_leader = map_utils.double_leader

-- Navigation with jump motions.
return {
  {
    "folke/flash.nvim",
    event = "VeryLazy",
    opts = {
      jump = { nohlsearch = true },
      modes = {
        -- Enable flash when searching with ? or /
        search = { enabled = false },
        char = { enabled = false },
      },
      label = {
        uppercase = false,
        style = "overlay",
      },
    },
    keys = {
      {
        "<leader>w",
        mode = { "n", "x", "o" },
        function()
          require("flash").jump()
        end,
        desc = "Flash",
      },
      {
        double_leader("f"),
        mode = { "n", "x", "o" },
        function()
          require("flash").jump()
        end,
        desc = "Flash",
      },
      -- hop.nvim like but with flash
      -- {
      -- 	"W",
      -- 	mode = { "n", "x", "o" },
      -- 	function()
      -- 		local function format(opts)
      -- 			-- always show first and second label
      -- 			return {
      -- 				{ opts.match.label1, "FlashMatch" },
      -- 				{ opts.match.label2, "FlashLabel" },
      -- 			}
      -- 		end
      -- 		local flash = require("flash")
      -- 		flash.jump({
      -- 			search = { mode = "search" },
      -- 			label = { after = false, before = { 0, 0 }, uppercase = false, format = format },
      -- 			pattern = [[\<]],
      -- 			action = function(match, state)
      -- 				state:hide()
      -- 				flash.jump({
      -- 					search = { max_length = 0 },
      -- 					highlight = { matches = false },
      -- 					label = { format = format },
      -- 					matcher = function(win)
      -- 						-- limit matches to the current label
      -- 						return vim.tbl_filter(function(m)
      -- 							return m.label == match.label and m.win == win
      -- 						end, state.results)
      -- 					end,
      -- 					labeler = function(matches)
      -- 						for _, m in ipairs(matches) do
      -- 							m.label = m.label2 -- use the second label
      -- 						end
      -- 					end,
      -- 				})
      -- 			end,
      -- 			labeler = function(matches, state)
      -- 				local labels = state:labels()
      -- 				for m, match in ipairs(matches) do
      -- 					match.label1 = labels[math.floor((m - 1) / #labels) + 1]
      -- 					match.label2 = labels[(m - 1) % #labels + 1]
      -- 					match.label = match.label1
      -- 				end
      -- 			end,
      -- 		})
      -- 	end,
      -- },
    },
  },
  {
    "smoka7/hop.nvim",
    event = "VeryLazy",
    opts = {},
    keys = {
      {
        "W",
        mcmd("HopWord"),
      },
      -- {
      -- 	double_leader("w"),
      -- 	mcmd("HopWordAC"),
      -- },
      -- {
      -- 	double_leader("b"),
      -- 	mcmd("HopWordBC"),
      -- },
    },
  },
}
