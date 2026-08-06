// src/data/story/converted_pool.js
// 舊 data_frames.js + data_endings.js 轉換而來，已去重並套用兩輪修正
// 共 106 篇（23 結局 + 83 框架），對應規則見 CONVERSION_PROMPT.md

export const ConvertedPool = [
  {
    "id": "ending_survival_01",
    "applicable_plugins": [
      "escape_room",
      "horror"
    ],
    "stage": "ending",
    "ending_id": "ending_survival",
    "ending_name": "生存",
    "vibe": "triumph",
    "text_template": "你的{傷口}已經止住了血。{出口}就在眼前，陽光從縫隙透進來，照在你滿是灰塵的臉上。你不知道接下來會怎樣，但你還活著——這已經足夠了。"
  },
  {
    "id": "ending_happy_01",
    "applicable_plugins": [
      "harem",
      "social_climb",
      "raising"
    ],
    "stage": "ending",
    "ending_id": "ending_happy",
    "ending_name": "快樂",
    "vibe": "triumph",
    "text_template": "你笑得有點傻，{同伴}也跟著笑了起來。{場所}的{光線描述}把一切都染成暖色，這個{時機}沒有什麼大道理，只是很——快樂。"
  },
  {
    "id": "ending_bliss_01",
    "applicable_plugins": [
      "harem",
      "social_climb"
    ],
    "stage": "ending",
    "ending_id": "ending_bliss",
    "ending_name": "幸福",
    "vibe": "triumph",
    "text_template": "{同伴}的手握著你的手，你們沉默地走過{場所}。不需要說什麼，{天氣描述}已經說完了一切。你想，這大概就是幸福的形狀。"
  },
  {
    "id": "ending_beautiful_01",
    "applicable_plugins": [
      "harem",
      "social_climb",
      "escape_room"
    ],
    "stage": "ending",
    "ending_id": "ending_beautiful",
    "ending_name": "美好",
    "vibe": "triumph",
    "text_template": "你站在{地點描述}，{天氣描述}讓一切看起來不太真實。你環顧四周，意識到有些事情已經永遠改變了——往好的方向。這就夠了，真的夠了。"
  },
  {
    "id": "ending_fame_01",
    "applicable_plugins": [
      "intrigue",
      "social_climb"
    ],
    "stage": "ending",
    "ending_id": "ending_fame",
    "ending_name": "萬人追捧",
    "vibe": "triumph",
    "text_template": "{人群}的{反應}讓你一時間沒有做好準備。你站在{位置}，試著讓自己看起來比現在感覺的更從容。你做到了——或者說，你的{外表}做到了。在那之後很長一段時間，你都記得這個{時刻}的形狀。"
  },
  {
    "id": "ending_star_01",
    "applicable_plugins": [
      "intrigue",
      "social_climb"
    ],
    "stage": "ending",
    "ending_id": "ending_star",
    "ending_name": "明星",
    "vibe": "triumph",
    "text_template": "鎂光燈打下來的時候，你只有一個念頭：{內心OS}。{周圍人物}全都看著你，眼神裡是崇拜，或者嫉妒，或者兩者都有。管他的——聚光燈就是你的，至少現在是。"
  },
  {
    "id": "ending_followers_01",
    "applicable_plugins": [
      "social_climb",
      "raising"
    ],
    "stage": "ending",
    "ending_id": "ending_followers",
    "ending_name": "百萬追隨者",
    "vibe": "triumph",
    "text_template": "你的{裝置}螢幕根本滑不完。你做的那件事不知道什麼時候被截圖放上去，然後傳開了，然後爆了。{評語}的內容你看得眼皮跳。你把手機翻過去，深呼吸——你需要一個{應對方式}。"
  },
  {
    "id": "ending_legacy_01",
    "applicable_plugins": [
      "escape_room",
      "deduction",
      "intrigue"
    ],
    "stage": "ending",
    "ending_id": "ending_legacy",
    "ending_name": "被人紀念的一生",
    "vibe": "triumph",
    "text_template": "多年以後，{後來者}在{地點描述}找到了你留下的{遺物}。沒有人記得你的名字，但他們知道那個{時代}曾有一個人做了一件正確的事。{遺物}被小心地放好，你沒有留下解釋，事情本身就是解釋。"
  },
  {
    "id": "ending_truth_01",
    "applicable_plugins": [
      "deduction",
      "deduction_debate"
    ],
    "stage": "ending",
    "ending_id": "ending_truth",
    "ending_name": "查明真相",
    "vibe": "triumph",
    "text_template": "你把{證據}攤在{對象}面前，一字不發。{沉默}持續了很長時間。最後，{對象}的{神情}崩了，說出了那句話。所有拼圖在你腦中喀哒一聲落定——就是這樣。原來一切，都是這樣。"
  },
  {
    "id": "ending_death_01",
    "applicable_plugins": [
      "horror",
      "escape_room"
    ],
    "stage": "ending",
    "ending_id": "ending_death",
    "ending_name": "死亡",
    "text_template": "你倒下的時候，{地點描述}的{環境細節}還在{動作}。某種奇異的、徹底的平靜爬上來——不是解脫，只是結束。你最後看見的，是{最後所見}，然後連那個也消失了。"
  },
  {
    "id": "ending_madness_01",
    "applicable_plugins": [
      "horror",
      "deduction"
    ],
    "stage": "ending",
    "ending_id": "ending_madness",
    "ending_name": "瘋狂",
    "text_template": "後來的事你不記得了。你只記得{觸發事件}的那個{時間}，以及之後那雙{恐怖意象}。他們在{地點描述}找到你的時候，你正在說{你在說的話}，嘴裡唸著什麼，連你自己也不知道那是什麼意思。"
  },
  {
    "id": "ending_helpless_01",
    "applicable_plugins": [
      "horror",
      "escape_room",
      "deduction"
    ],
    "stage": "ending",
    "ending_id": "ending_helpless",
    "ending_name": "無能為力",
    "vibe": "dread",
    "text_template": "你試過了所有方法。你坐下來，把{道具}放到地上，閉上眼睛。有些事，不是努力就能改變的。{地點描述}的{環境細節}沒有給你任何答案——它只是繼續存在著，像什麼都沒有發生過。"
  },
  {
    "id": "ending_collapse_01",
    "applicable_plugins": [
      "intrigue",
      "deduction"
    ],
    "stage": "ending",
    "ending_id": "ending_collapse",
    "ending_name": "一敗塗地",
    "vibe": "dread",
    "text_template": "{對象}把你的{計謀殘骸}一一列舉出來，每說一條，{人群}就安靜一分。你站在{場所}中央，沒有人過來。你很清楚——結束了。有些失敗不需要最後一擊，它在更早之前就已經決定了。"
  },
  {
    "id": "ending_shame_01",
    "applicable_plugins": [
      "intrigue",
      "social_climb"
    ],
    "stage": "ending",
    "ending_id": "ending_shame",
    "ending_name": "無臉見人",
    "vibe": "dread",
    "text_template": "那段傳言已經傳遍了整個{場所}。你縮在{藏身處}，把{遮蔽物}拉到臉上，試圖讓自己消失。外面有人在討論，你聽見自己的名字——伴隨著{評語}。你的{裝置}震個不停，你把它翻面，扣在地上。"
  },
  {
    "id": "ending_prison_01",
    "applicable_plugins": [
      "intrigue",
      "deduction"
    ],
    "stage": "ending",
    "ending_id": "ending_prison",
    "ending_name": "鋃鐺入獄",
    "vibe": "dread",
    "text_template": "{腳鐐聲}在{走廊}迴盪。你低著頭，視線落在自己的{鞋}上，身旁的{押送者}沒有說話。你想起出發前還覺得這個計畫{形容詞}——你想起得太清楚了。{牢門}在你身後關上，發出一聲沉悶的扣響。"
  },
  {
    "id": "ending_silenced_01",
    "applicable_plugins": [
      "deduction",
      "horror"
    ],
    "stage": "ending",
    "ending_id": "ending_silenced",
    "ending_name": "被滅口",
    "text_template": "你來不及說出那句話。{地點描述}很快就沉默了，只剩下{環境聲音}。{關鍵證據}從你手中滑落，落進{黑暗之處}。多年後沒有人記得你調查過什麼——這個案子，永遠是懸案。"
  },
  {
    "id": "ending_purge_01",
    "applicable_plugins": [
      "intrigue"
    ],
    "stage": "ending",
    "ending_id": "ending_purge",
    "ending_name": "株連九族",
    "vibe": "dread",
    "text_template": "聖旨念完的時候，{場所}裡沒有一點聲音。你跪在{地面材質}上，腦中一片空白。不知道是誰先哭出聲來——然後到處都是{哭聲}。你想說什麼，但嘴唇只是動了動。你帶下去的，不只是你自己。"
  },
  {
    "id": "ending_sacrifice_01",
    "applicable_plugins": [
      "escape_room",
      "intrigue"
    ],
    "stage": "ending",
    "ending_id": "ending_sacrifice",
    "ending_name": "慘烈犧牲",
    "vibe": "dread",
    "text_template": "你推開{對象}的時候，就知道自己回不來了。{衝擊}打在你身上，你聽見{對象}在遠處喊你的名字，聲音越來越遠。這很痛，但比你想的要短——你沒來得及後悔，然後什麼都沒有了。"
  },
  {
    "id": "ending_dream_01",
    "applicable_plugins": [
      "horror",
      "social_climb",
      "harem"
    ],
    "stage": "ending",
    "ending_id": "ending_dream",
    "ending_name": "夢一場",
    "text_template": "你睜開眼，{天花板}。你坐起來，{地點描述}一切如常，{日常細節}擺在原處。你試圖回想，但{記憶}已經在退去——你只記得一個{殘像}，然後連那個也消失了。也許什麼都沒發生過，也許發生了但不重要了。"
  },
  {
    "id": "ending_unknown_01",
    "applicable_plugins": [
      "escape_room",
      "deduction"
    ],
    "stage": "ending",
    "ending_id": "ending_unknown",
    "ending_name": "默默無名",
    "text_template": "事情解決了。你站在{地點描述}，沒有人拍你肩膀，沒有人說謝謝。人群已經散去，{場所}回到它本來的樣子。你把{道具A}收好，轉身離開。沒有人知道你做過什麼——這或許正是你想要的。"
  },
  {
    "id": "ending_ignored_01",
    "applicable_plugins": [
      "social_climb",
      "intrigue"
    ],
    "stage": "ending",
    "ending_id": "ending_ignored",
    "ending_name": "無人在意",
    "text_template": "你說完了。{場所}裡的人繼續做他們的事。你清了清喉嚨，又試了一次。還是沒有人理你。你慢慢把{道具A}放下，在心裡默默計算今天已經{丟臉次數}次了。"
  },
  {
    "id": "ending_numb_01",
    "applicable_plugins": [
      "horror",
      "deduction"
    ],
    "stage": "ending",
    "ending_id": "ending_numb",
    "ending_name": "放棄思考",
    "text_template": "你不想弄清楚了。你在{地點描述}找了個{休憩處}坐下來，看著{景象}發呆。{時間流逝}，你什麼都沒有想。這感覺出奇地好——不是幸福，只是終於不再用力了。"
  },
  {
    "id": "ending_mundane_01",
    "applicable_plugins": [
      "social_climb",
      "harem"
    ],
    "stage": "ending",
    "ending_id": "ending_mundane",
    "ending_name": "平淡無事",
    "text_template": "就這樣結束了。你走回{地點描述}，{形容詞}地坐下來。今天發生的事回想起來有點像夢，但你的{生理反應}告訴你那是真的。你打開{裝置}，心想——嗯，明天應該又是普通的一天。"
  },
  {
    "id": "frame_opening_001",
    "applicable_plugins": [
      "horror",
      "escape_room"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "你醒來的時候，第一眼看見的是{天花板材質}。{消毒水氣味}充斥著整個空間，走廊盡頭傳來{細微聲響}。你試著想起自己為什麼在這裡——但記憶像{記憶比喻}，怎麼抓都抓不住。"
  },
  {
    "id": "frame_opening_002",
    "applicable_plugins": [
      "escape_room",
      "horror"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "你站在{林間地點}，{光線描述}透過{樹冠描述}灑下來。{背景聲音}從四面八方包圍著你，你深吸一口氣，聞到{氣味描述}的味道。你不確定自己要往哪裡走——但腳下的{地面狀態}告訴你，有人剛剛走過這裡。"
  },
  {
    "id": "frame_opening_003",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "下課鐘聲剛響完，走廊上的喧嘩聲在幾分鐘內消失殆盡。你一個人留在教室裡，{光線描述}從窗縫透進來。黑板上還留著{神秘字句}，你無意間讀了一遍，心裡有什麼東西{心情動詞}了一下。"
  },
  {
    "id": "frame_opening_004",
    "applicable_plugins": [
      "intrigue"
    ],
    "stage": "loop",
    "tension": "低",
    "text_template": "{晨光描述}打在{宮殿建築}的{屋脊描述}上，金燦燦的一片。你站在{廊道名稱}，手裡捏著剛送到的{文書種類}，還沒拆封。來送信的那個{傳信者}走得很快，快得有點——不尋常。"
  },
  {
    "id": "frame_opening_005",
    "applicable_plugins": [
      "deduction",
      "escape_room"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "{背景聲音}從窗外傳進來。你盯著面前的{文件描述}，讀了不下三遍。上面的內容讓你皺起眉頭。不是什麼大事，理論上不是——但有個什麼東西在你胸口{心情描述}，讓你沒辦法把它當成普通的事。"
  },
  {
    "id": "frame_opening_006",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "這趟任務的說明書寫得{形容詞}，讓你看了三遍還是沒弄清楚重點是什麼。你把它折好，往{地點描述}走去。{天氣描述}，空氣裡飄著{氣味描述}的味道。你心想：最壞的情況，無非就是{最壞預想}——然後你就聽見前方傳來一聲{突發聲響}。"
  },
  {
    "id": "frame_opening_007",
    "applicable_plugins": [
      "escape_room"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "門在你身後關上的聲音悶悶的，像是一個句點。你環顧四周：{密室陳設A}、{密室陳設B}，還有{密室陳設C}，以及——牆壁上潦草寫著的幾個字：「{神秘字句}」。你不確定這算不算線索，但你也沒有別的地方可以看了。"
  },
  {
    "id": "frame_opening_008",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "你一直覺得這種地方白天看起來很普通，但{時間描述}之後就不一樣了。你拿著{器材}，在{入口處}停下來深呼吸。不是第一次了，你告訴自己。不是第一次，你一定可以——{環境聲音}從裡面傳出來，打斷了你的自我激勵。"
  },
  {
    "id": "frame_opening_009",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "你收到的那封{訊息載體}裡只有一個地址，和一句話：「{神秘指令}。」你照做了——這就是你現在站在{地點描述}的原因。寄信的人沒有留名字。你的{同伴}說這是個壞主意，你沒有反駁。現在你們都在這裡，沉默地看著彼此。"
  },
  {
    "id": "frame_opening_010",
    "applicable_plugins": [
      "horror",
      "escape_room"
    ],
    "stage": "start",
    "tension": "中",
    "text_template": "{地點描述}的{氣味描述}讓你第一步踩進去就想後退。你沒有後退。{器材}的光圈在牆壁上掃過{地面狀態}，你試圖在這些混亂裡找出什麼是最近留下的。{腳步聲描述}在你腦中一閃——你停住，側耳傾聽。"
  },
  {
    "id": "frame_opening_011",
    "applicable_plugins": [
      "deduction",
      "escape_room",
      "horror"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "今天只是普通的一天，你本來這樣以為。你把東西整理好，往目的地走，路上還在想別的事。然後你看見了{觸發異物}，停下腳步。普通的一天就這樣在你面前打了個{轉折比喻}，再也回不去了。"
  },
  {
    "id": "frame_opening_012",
    "applicable_plugins": [
      "deduction",
      "escape_room",
      "horror"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "辦完入住手續，你走進房間，把行李放好。窗外是{景色描述}，{窗戶聲音}讓你有點分神。你打開桌上的{意外道具}，赫然發現裡面有一封信，抬頭寫著你的名字——一個你從沒告訴任何人的、另一個名字。"
  },
  {
    "id": "frame_opening_013",
    "applicable_plugins": [
      "harem",
      "social_climb",
      "raising"
    ],
    "stage": "loop",
    "tension": "低",
    "text_template": "你第一次見到那個人，是在{相遇地點}。對方站在{地點描述}，正在做著什麼，完全沒注意到你。你不知道為什麼你停下來了。按道理你應該繼續走——但你就是停下來了，看著那個{對象形象描述}，有什麼東西在你心裡{心情動詞}了一下。"
  },
  {
    "id": "frame_opening_014",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction"
    ],
    "stage": "start",
    "tension": "中",
    "text_template": "傳言說，{地點描述}在幾年前就沒有人進去過了。你今天進去了。{環境聲音}讓你一時間以為什麼都沒有變，直到你注意到{異常細節}——這東西不應該在這裡，無論如何都不應該。"
  },
  {
    "id": "frame_opening_015",
    "applicable_plugins": [
      "escape_room",
      "deduction",
      "intrigue"
    ],
    "stage": "start",
    "tension": "低",
    "text_template": "你捏著那張{文件描述}，讀了不下十遍。上面的指示簡單到讓你起疑——事情很少這麼簡單。你把它折好，想著最壞也不過是{最壞預想}。{天氣描述}，是個{好壞形容}的日子。你出發了。"
  },
  {
    "id": "frame_turning_001",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "那個人靠過來，壓低聲音說：「{警告語句}。」你看著對方的眼睛，試圖判斷這是好意還是威脅。{神情}讓你看不出來。在你做出決定之前，{突發事件}打斷了你們。"
  },
  {
    "id": "frame_turning_002",
    "applicable_plugins": [
      "deduction",
      "deduction_debate"
    ],
    "stage": "investigate",
    "tension": "中",
    "text_template": "你手上的那個線索和你原本的判斷對不上。如果這是真的，那你之前的認知就全部錯了。你在{地點描述}站了很久，腦子高速轉動，試圖把兩件事拼湊在一起——然後你想到了一個你非常不想面對的可能性。"
  },
  {
    "id": "frame_turning_003",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "{環境聲音}停了。你說不出為什麼，但那一刻你知道有什麼東西改變了。{地點描述}的{異常細節}還在原處，但氣氛變了——像{比喻描述}。你站著沒動，等待下一步。"
  },
  {
    "id": "frame_turning_004",
    "applicable_plugins": [
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "{朝廷人物}突然請求與你密談。你在{場所}相對而坐，空氣裡是說不清的{情緒}。對方開口說的第一句話是：「{開場白}。」你意識到，接下來你說的每一個字都很重要。"
  },
  {
    "id": "frame_turning_005",
    "applicable_plugins": [
      "harem",
      "social_climb",
      "raising"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你們之間的對話比你預期的更長。不知道從什麼時候開始，{時間變化}，但你們還在{地點描述}說話。對方說了一件你從沒想過的事：「{對方回應}。」你愣了一秒。"
  },
  {
    "id": "frame_turning_006",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "require_tags": [
      "state:武裝"
    ],
    "text_template": "你的{武裝道具}發出{異常訊號}。你停下來檢查，發現它已經{故障狀態}——就是現在這個最不該出問題的時候。你在{地點描述}蹲下來，試圖在有限的時間裡做點什麼。"
  },
  {
    "id": "frame_turning_007",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你本來的計畫在{地點描述}遇到了{意外狀況}。你環顧四周：{逃脫選項A}在你左手邊，{逃脫選項B}在右手邊，還有一個你一開始沒注意到的可能性藏在{角落}裡。"
  },
  {
    "id": "frame_turning_008",
    "applicable_plugins": [
      "deduction",
      "intrigue",
      "escape_room"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你以為的任務和眼前看到的完全對不上號。說明書裡的內容根本不在這裡，取而代之的是{環境異常}。你重新把說明書看了一遍，確認自己沒有理解錯誤——然後你意識到，有人說了謊。"
  },
  {
    "id": "frame_turning_009",
    "applicable_plugins": [
      "deduction",
      "horror"
    ],
    "stage": "investigate",
    "tension": "中",
    "text_template": "{地面描述}裡的血跡從某個位置延伸到某個位置，然後就沒了。你蹲在地上，試圖從這個不完整的敘事裡推算出什麼。時間不會太久——也許就在{時間描述}之前。你的{裝置}訊號只有一格。"
  },
  {
    "id": "frame_turning_010",
    "applicable_plugins": [
      "horror",
      "escape_room"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你聽見的那個聲音又響了一次。你確定它在移動——而且在靠近。你在{地點描述}快速掃視四周，盤點可用的東西：{道具A}、{道具B}，還有{環境異常}可以利用。時間不多了。"
  },
  {
    "id": "frame_turning_011",
    "applicable_plugins": [
      "deduction",
      "horror",
      "escape_room"
    ],
    "stage": "investigate",
    "tension": "中",
    "text_template": "你在{醫院地點}找到了{文件描述}。上面的資訊和你原本的認知差了十萬八千里——如果這份文件是真的，那一切就從來都不是你以為的那樣。你把它疊好，意識到自己的手在抖。"
  },
  {
    "id": "frame_turning_012",
    "applicable_plugins": [
      "intrigue",
      "deduction",
      "social_climb"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你以為可以信任的那個人，在{時機}說出了一句你沒預料到的話。不是威脅，也不算背叛，但有什麼東西在你心裡{心情動詞}了一下，再也回不去了。你盯著對方的臉，試圖找出說謊或說真話的痕跡。"
  },
  {
    "id": "frame_turning_013",
    "applicable_plugins": [
      "escape_room",
      "horror"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你在{林間地點}走了很久，卻發現你繞回到同一個地方。你的方向感工具在{自然環境狀況}下完全不可靠。你停下來，告訴自己不要慌——然後，你聽見了{細微聲響}。"
  },
  {
    "id": "frame_turning_014",
    "applicable_plugins": [
      "social_climb",
      "harem",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "對方看你的眼神變了。你知道是因為{誤解內容}，但你說不清楚，或者你說了也沒用。{地點描述}讓這一刻更難堪：周圍的人都注意到了，有人停下來看。你深吸一口氣，試圖決定下一步。"
  },
  {
    "id": "frame_turning_015",
    "applicable_plugins": [
      "escape_room",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你手上突然多了一個{意外道具}，給你的人在說清楚之前就消失了。你翻來覆去看著它：{道具特徵描述}，{道具異常細節}。這個東西和你今天要做的事有沒有關係？你不知道——但你有一種感覺，它很重要。"
  },
  {
    "id": "frame_turning_016",
    "applicable_plugins": [
      "escape_room",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你在{都市地點}遇到了{意外狀況}——正常情況下這不算什麼大事，但今天，在{時機}，它剛好卡在你原計畫最關鍵的節點上。你站在{地點描述}，快速重新計算。你有{時間限制}，而且選項不多。"
  },
  {
    "id": "frame_crisis_001",
    "applicable_plugins": [
      "horror",
      "escape_room"
    ],
    "stage": "loop",
    "tension": "高",
    "require_tags": [
      "state:孤立"
    ],
    "text_template": "你的{器材}在{醫院地點}突然{故障方式}，四周陷入{黑暗描述}。{環境聲音}從某個你定位不了的地方傳來，越來越近。你的手指摸索著{器材}，試圖讓它再亮一次——它沒有。"
  },
  {
    "id": "frame_crisis_002",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "他們知道你在這裡了。你能聽見{追捕聲音}從各方向逼近。你在{地點描述}裡快速評估：{逃脫選項A}，或者{逃脫選項B}，又或者——也許根本沒有選項。"
  },
  {
    "id": "frame_crisis_003",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "極限",
    "require_tags": [
      "state:恐懼"
    ],
    "text_template": "你背對著{地面材質}，面前是{威脅描述}。你數了一下距離——不夠遠。{時間限制}的壓迫讓你腦子清晰得出奇，你想到了{最後想法}，然後你決定做這一件事。"
  },
  {
    "id": "frame_crisis_004",
    "applicable_plugins": [
      "intrigue"
    ],
    "stage": "loop",
    "tension": "高",
    "require_tags": [
      "state:警覺"
    ],
    "text_template": "你還沒準備好，但{政敵}已經在朝堂上把指控說出來了。{皇帝/主上}的臉色是{臉色描述}。你只有幾個呼吸的時間決定怎麼應對。"
  },
  {
    "id": "frame_crisis_005",
    "applicable_plugins": [
      "deduction",
      "intrigue"
    ],
    "stage": "investigate",
    "tension": "高",
    "text_template": "你的{關鍵證據}就在{地點描述}，但{阻礙對象}也在那裡。你只有{時間窗口}，而且對方不是普通容易應付的人。如果你沒拿到那個證據，一切就結束了——但如果你被發現，也一樣結束。"
  },
  {
    "id": "frame_crisis_006",
    "applicable_plugins": [
      "escape_room",
      "horror"
    ],
    "stage": "loop",
    "tension": "高",
    "require_tags": [
      "state:受傷"
    ],
    "text_template": "{傷口描述}讓你的每一步都更難走。你知道自己的狀況，你知道這樣下去會怎樣。{地點描述}裡只有{道具A}，你必須決定把它用在哪裡。"
  },
  {
    "id": "frame_crisis_007",
    "applicable_plugins": [
      "intrigue",
      "deduction",
      "social_climb"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "你看著那個人站在對立陣營那一側，你們之間隔著{景色描述}，和一整段你以為你搞懂了的過去。對方沒有看你——或者說，刻意不看你。你感到一種比恐懼更冷的東西在你胸腔裡撐開。"
  },
  {
    "id": "frame_crisis_008",
    "applicable_plugins": [
      "horror",
      "deduction"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "你看見的那個東西，你的大腦拒絕把它接受為真實。你站在{地點描述}，{生理反應}，試圖告訴自己有一個{理性解釋}。但你找不到——你找了很久，你真的找不到。"
  },
  {
    "id": "frame_crisis_009",
    "applicable_plugins": [
      "escape_room",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "倒數計時在你腦中滴答作響。你必須在{時間限制}之內完成任務，否則一切就結束。你現在所在的位置距離目標還有段距離，中間還有{威脅描述}。你做了一個深呼吸，開始計算。"
  },
  {
    "id": "frame_crisis_010",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "極限",
    "require_tags": [
      "state:絕境"
    ],
    "text_template": "你已經沒有什麼可以失去的了。這個認知反而讓你清醒——一種奇怪的、透明的清醒。你在{地點描述}站直了身子，環視{威脅描述}。有人曾告訴你一句話，你當時不懂，現在懂了。"
  },
  {
    "id": "frame_crisis_011",
    "applicable_plugins": [
      "intrigue",
      "social_climb",
      "deduction_debate"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "對方的行動讓在場所有人都以為你做了{誤解內容}。你有一瞬間想要解釋，但解釋的空間已經被{突發事件}填滿了。你看著事情在你面前失控——每一秒都在離你原本希望的方向越走越遠。"
  },
  {
    "id": "frame_crisis_012",
    "applicable_plugins": [
      "escape_room"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "密室機關啟動了。你聽見{環境聲音}，看見{環境異常}。你有{時間限制}內機會阻止它——但你在{地點描述}找到的線索指向兩個完全相反的解法。你只能選一個，而且只有一次機會。"
  },
  {
    "id": "frame_crisis_013",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction"
    ],
    "stage": "loop",
    "tension": "高",
    "require_tags": [
      "state:孤立"
    ],
    "text_template": "你的{裝置}終於有一格訊號。你知道這不一定夠，但這可能是你最後的機會。你在{地點描述}縮進{角落}，試圖打出那則求救訊息。手指在顫抖的狀態下，每個字都花了比平時更多的時間。"
  },
  {
    "id": "frame_crisis_014",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "極限",
    "text_template": "你以為已經結束了。威脅再次出現的時候，你已經把{武裝道具}用完了。你站在{地點描述}，面對{二次威脅}，身後是你想要保護的人。你現在唯一擁有的，是你自己。"
  },
  {
    "id": "frame_crisis_015",
    "applicable_plugins": [
      "intrigue",
      "deduction_debate"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "對手一條一條把你的計畫說出來，每一條都和你私下的部署對得上號。你意識到消息在某個環節洩漏了，但你現在沒有時間找那個環節——你要先應對站在你面前的這個局面。"
  },
  {
    "id": "frame_crisis_016",
    "applicable_plugins": [
      "horror",
      "deduction"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "你已經分不清哪些是真實，哪些是你自己加上去的了。{地點描述}在你眼前{環境異常}，你{生理反應}，抓著{道具A}試圖讓自己穩定。你的腦子裡有一個聲音在說{幻聽描述}——你不知道那個聲音說的是不是對的。"
  },
  {
    "id": "frame_crisis_017",
    "applicable_plugins": [
      "escape_room",
      "horror"
    ],
    "stage": "loop",
    "tension": "極限",
    "require_tags": [
      "state:孤立"
    ],
    "text_template": "{地點描述}的{出入口}突然發出沉重的聲響，自動鎖死了。你被困在這裡了——沒有人知道你在這裡，也沒有人會來。你的{通訊工具}沒有訊號。{環境聲音}從某處傳來，提醒你：你不是唯一在這裡的東西。"
  },
  {
    "id": "frame_crisis_018",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "高",
    "require_tags": [
      "state:武裝"
    ],
    "text_template": "倒數計時在你腦中滴答作響。你必須在{時間限制}之內做出選擇——而你手上的{道具}，只能用在一個地方。{選項A}和{選項B}同樣重要，但你只能救一個。{環境細節}提醒你：時間正在流失。"
  },
  {
    "id": "frame_crisis_019",
    "applicable_plugins": [
      "intrigue",
      "deduction_debate"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "{對象}舉起手中的{偽造證物}，對著{周圍人物}高聲指控：「就是這個人！」所有目光瞬間集中到你身上。你知道這是栽贓——但在這個當下，事實不重要，敘事才重要。你只有幾秒鐘決定怎麼接住這個局。"
  },
  {
    "id": "frame_crisis_020",
    "applicable_plugins": [
      "escape_room",
      "horror"
    ],
    "stage": "loop",
    "tension": "極限",
    "text_template": "{追捕聲音}在{地點描述}裡迴盪，越來越近。你的{身體狀態}讓你知道你撐不了多久了。前方有兩條路：一條看起來能通往{出口描述}，但你不確定；另一條你很熟悉，但通向{已知危險}。你必須現在決定。"
  },
  {
    "id": "frame_confrontation_001",
    "applicable_plugins": [
      "deduction",
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "你和對方相對而坐，桌上是{關鍵物件}。沒有人先開口。你在等，對方也在等——是一場耐力的博弈，也是一場誰先暴露破綻的測試。你記起對方之前說過的一句話，那句話裡有個細節和現在對不上。"
  },
  {
    "id": "frame_confrontation_002",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "對方的反應和你預期的不太一樣。對方沒有慌，而是{姿態描述}，然後把問題甩了回來：「{反問內容}。」這個角度你沒有預設，你感到對話的主導權在換手。"
  },
  {
    "id": "frame_confrontation_003",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "你把最後一張牌亮出來。對方的{神情}在那一瞬間動了。不是崩潰，只是一個極小的{肢體細節}，但你看見了。你知道裂縫在哪裡了。"
  },
  {
    "id": "frame_confrontation_004",
    "applicable_plugins": [
      "intrigue"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "朝堂之上，{政敵}把你拉進了一場你本來可以置身事外的辯論。所有人都在看，你說的每一個字都會被記住。{政敵}話語犀利，邏輯縝密，卻在某個地方露了一個讓你心跳漏一拍的破綻。"
  },
  {
    "id": "frame_confrontation_005",
    "applicable_plugins": [
      "intrigue"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "{政敵}突然改變策略，從攻擊你轉向牽連你的關係人。你知道這是在試你的底線——對方要看你為了保住自己，願意犧牲多少。"
  },
  {
    "id": "frame_confrontation_006",
    "applicable_plugins": [
      "deduction_debate",
      "social_climb",
      "harem"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "你把話說出去之後，對方沉默了很長時間。{地點描述}的{環境聲音}顯得格外清晰。你不確定你做了正確的事，你只知道那些話在你胸腔裡堵太久了。對方終於開口，說的是：「{對方回應}。」"
  },
  {
    "id": "frame_confrontation_007",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "你終於找到機會把話說清楚了，但對方不打算聽。對方把你的辯解稱作{貶低詞}，把你的證據說成{否定說法}。周圍有人開始附和。你感到{情緒}，但你知道現在不是讓情緒主導的時候。"
  },
  {
    "id": "frame_confrontation_008",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "對方說到一半停下來了，眼神游移。你知道那是什麼意思——對方在計算，到底說還是不說。你沒有催促，你只是{姿態描述}，讓沉默繼續壓著。"
  },
  {
    "id": "frame_confrontation_009",
    "applicable_plugins": [
      "deduction_debate",
      "social_climb"
    ],
    "stage": "debate",
    "tension": "高",
    "require_tags": [
      "state:憤怒"
    ],
    "text_template": "你的話越說越快，對方的回應也越來越激烈。你們之間的交鋒已經從邏輯變成了情緒。{地點描述}裡，旁觀者退開了一步。你意識到你快要說出一句你沒辦法收回的話。"
  },
  {
    "id": "frame_confrontation_010",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "局勢在你說出那句關鍵的話之後悄悄改變了。你注意到原本中立的人換了一個{肢體細節}，對手的語調也細微地降了一個音量。還沒結束，但你感覺到了——天平在動。"
  },
  {
    "id": "frame_confrontation_011",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "你把{關鍵證據}放到對方面前，說：「解釋一下這個。」對方低頭看了一眼，然後抬起頭，臉上是你沒有預料到的{神情}——不是驚慌，而是某種讓你不確定怎麼解讀的表情。你的節奏被打亂了一下。"
  },
  {
    "id": "frame_confrontation_012",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "你把全部的{罪證}攤在{場所}之上。這是你最後的機會，也是對方最後的機會。四周的人在等著看，{皇帝/主上}的目光像{比喻描述}，壓在你們兩個人身上。"
  },
  {
    "id": "frame_confrontation_013",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "對方說出了一句你根本沒有辦法立刻反駁的話——不是因為它是對的，而是因為它太接近某個你不想承認的事實。你站在{地點描述}，腦子高速運轉，試圖找到那個反駁的切入點。"
  },
  {
    "id": "frame_confrontation_014",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "你感到這場對峙快要到一個臨界點了。對方說話的方式變了，有個{肢體細節}在你眼裡放大了。你在這個瞬間做了一個判斷——而這個判斷決定了你接下來的每一步。"
  },
  {
    "id": "frame_confrontation_015",
    "applicable_plugins": [
      "deduction_debate",
      "social_climb",
      "harem"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "這場對話本來可以不用走到這裡的。你和對方都知道這件事。但你們還是走到了這裡，站在{地點描述}，說著說不完的話。你不知道還能說什麼，因為你最想說的那句話說出來只會讓事情更糟。"
  },
  {
    "id": "frame_confrontation_016",
    "applicable_plugins": [
      "deduction",
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "{對象}和另外兩個人被困在同一個局裡，三人的說法互相矛盾。你聽著他們的供詞在腦中快速推演——如果{對象A}說的是真話，那{對象B}的說法就站不住腳；但如果{對象B}才是對的……你需要在他們察覺你的推理之前，找出那個破綻。"
  },
  {
    "id": "frame_confrontation_017",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "高",
    "text_template": "{對象}試圖把話題從「你說的是不是真的」轉移到「你這個人本身有什麼問題」。這是一個經典的轉移焦點手法——而你周圍的人，有些人已經開始被帶偏了。你必須決定：跟著對方進入這個戰場，還是把話題拉回原點。"
  },
  {
    "id": "frame_confrontation_018",
    "applicable_plugins": [
      "deduction_debate"
    ],
    "stage": "debate",
    "tension": "極限",
    "text_template": "{對象}的手在發抖。你知道對方手裡還握著最後一張牌——一個能讓所有人的命運瞬間翻轉的選擇。{周圍人物}屏住呼吸等待著。你能感覺到，下一句話說出口，就再也收不回來了。"
  },
  {
    "id": "frame_hub_001",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你回到{地點描述}，這裡比你離開的時候多了一點{環境異常}。你整理了一下手邊的東西，思考接下來該怎麼走。三個方向擺在你面前，每一個看起來都{形容詞}。"
  },
  {
    "id": "frame_hub_002",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "低",
    "text_template": "你在{地點描述}找了個{休憩處}坐下來。剛才發現的那個線索還在你腦子裡轉，你試著把它和你已知的事情拼在一起。三條路仍然擺在你面前。"
  },
  {
    "id": "frame_hub_003",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue",
      "social_climb"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你在{相遇地點}又遇到了那個人。這次對方多說了一些，你多聽了一些。{地點描述}的{背景聲音}讓你們的對話有種說不清楚的輕鬆。但你知道這個輕鬆是暫時的。"
  },
  {
    "id": "frame_hub_004",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "{時間變化}。你站在{地點描述}，盤點自己到目前為止知道的事。事情的輪廓比你進來的時候清晰了一些，但還沒到足夠的程度。你需要繼續。"
  },
  {
    "id": "frame_interrupt_pos_001",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "就在你以為這趟沒什麼收穫的時候，{地點描述}的{角落}出現了一個{意外道具}。你走過去，蹲下來看，意識到這件事的重量——它改變了你接下來所有的計算。"
  },
  {
    "id": "frame_interrupt_pos_002",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "你的{裝置}突然震動了——是一則完全意外的訊息，來自你沒想到的地方。你只有幾秒鐘讀完它，但它告訴你的那件事足以讓整個局面翻轉。"
  },
  {
    "id": "frame_interrupt_pos_003",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "你以為只有你一個人的{同伴}突然出現在{地點描述}。你們對看了一秒——你想說的話有太多，但現在不是說話的時候。對方手上拿著你需要的東西，遞給你，說了一句簡短的話。"
  },
  {
    "id": "frame_interrupt_pos_004",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "高",
    "text_template": "你之前做的某個決定的結果現在突然派上用場了。{道具A}在這個時間點出現，讓你突然有了一個之前沒有的選項。這個選項很冒險，但它存在。"
  },
  {
    "id": "frame_interrupt_pos_005",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "loop",
    "tension": "中",
    "text_template": "{環境異常}。你不知道是什麼造成的，但它讓阻礙你的那個東西暫時失效了。你有一個窗口，不大，但足夠讓你做一件你一直在等機會做的事。"
  },
  {
    "id": "frame_interrupt_neg_001",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "interrupt_neg",
    "tension": "中",
    "text_template": "你需要停一下。{生理反應}提醒你，你已經在這個狀態下撐了太久。{地點描述}有個{休憩處}，你在那裡坐下來，讓自己喘一口氣，重新整理你知道的事。"
  },
  {
    "id": "frame_interrupt_neg_002",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "interrupt_neg",
    "tension": "中",
    "text_template": "你走錯路了。你在{地點描述}站著，確認了三次，才接受這個事實。這意味著你必須原路退回去——這消耗了你的時間和體力，但至少你沒有繼續走進死路。"
  },
  {
    "id": "frame_interrupt_neg_003",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "interrupt_neg",
    "tension": "中",
    "text_template": "局面沒有你想的那麼緊迫。你在{地點描述}停下來，重新確認了那個讓你誤判的資訊——原來你誤讀了某個訊號，事情還在你能掌控的範圍內。你深吸一口氣，慢慢把節奏降下來。"
  },
  {
    "id": "frame_interrupt_neg_004",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue",
      "social_climb"
    ],
    "stage": "interrupt_neg",
    "tension": "中",
    "text_template": "{同伴}的出現意外地讓氣氛緩和了一些。不是因為什麼大事，只是對方說了一句{不合時宜卻很好笑的話}，然後你們在{地點描述}沉默了一秒，然後都笑出來了。這個笑讓你暫時從緊繃裡出來一下。"
  },
  {
    "id": "frame_interrupt_neg_005",
    "applicable_plugins": [
      "escape_room",
      "horror",
      "deduction",
      "intrigue"
    ],
    "stage": "interrupt_neg",
    "tension": "中",
    "text_template": "你發現你拿到的某個關鍵前提可能是錯的。不是大錯，但這意味著你要重新確認幾件事，才能繼續行動——這讓整個節奏慢下來，但也讓你避免了把錯誤的推斷帶進接下來的每一步。"
  }
];