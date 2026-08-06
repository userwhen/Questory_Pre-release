// data_endings.js
// 結局類型定義：id、name、type、適合劇情類型、tag_pool、text_template

export const ENDINGS = [

  // ─────────────────────────────────────────────
  // 正向結局（9個）
  // ─────────────────────────────────────────────
  {
    id: "ending_survival",
    name: "生存",
    type: "正向",
    genres: ["恐怖", "生存"],
    tag_pool: ["plot:擊退威脅", "plot:找到出路", "plot:完成任務", "plot:求救嘗試"],
    forbid_pool: ["plot:受致命傷"],
    text_template: "你的{傷口}已經止住了血。{出口}就在眼前，陽光從縫隙透進來，照在你滿是灰塵的臉上。你不知道接下來會怎樣，但你還活著——這已經足夠了。"
  },
  {
    id: "ending_happy",
    name: "快樂",
    type: "正向",
    genres: ["戀愛", "搞笑"],
    tag_pool: ["plot:心結化解", "plot:獲得回應", "plot:誤會解開", "plot:初次相遇"],
    forbid_pool: ["plot:關係破裂"],
    text_template: "你笑得有點傻，{同伴}也跟著笑了起來。{場所}的{光線描述}把一切都染成暖色，這個{時機}沒有什麼大道理，只是很——快樂。"
  },
  {
    id: "ending_bliss",
    name: "幸福",
    type: "正向",
    genres: ["戀愛"],
    tag_pool: ["plot:告白成功", "plot:心結化解", "plot:獲得回應", "plot:秘密坦白", "plot:共度危機"],
    forbid_pool: ["plot:遭到拒絕", "plot:關係破裂"],
    text_template: "{同伴}的手握著你的手，你們沉默地走過{場所}。不需要說什麼，{天氣描述}已經說完了一切。你想，這大概就是幸福的形狀。"
  },
  {
    id: "ending_beautiful",
    name: "美好",
    type: "正向",
    genres: ["戀愛", "搞笑", "生存"],
    tag_pool: ["plot:完成任務", "plot:心結化解", "plot:誤會解開", "plot:共度危機"],
    forbid_pool: [],
    text_template: "你站在{地點描述}，{天氣描述}讓一切看起來不太真實。你環顧四周，意識到有些事情已經永遠改變了——往好的方向。這就夠了，真的夠了。"
  },
  {
    id: "ending_fame",
    name: "萬人追捧",
    type: "正向",
    genres: ["宮鬥", "搞笑"],
    tag_pool: ["plot:公開表態", "plot:贏得支持", "plot:扭轉局勢", "plot:才能展現"],
    forbid_pool: ["plot:信譽崩潰"],
    text_template: "{人群}的{反應}讓你一時間沒有做好準備。你站在{位置}，試著讓自己看起來比現在感覺的更從容。你做到了——或者說，你的{外表}做到了。在那之後很長一段時間，你都記得這個{時刻}的形狀。"
  },
  {
    id: "ending_star",
    name: "明星",
    type: "正向",
    genres: ["搞笑", "宮鬥"],
    tag_pool: ["plot:公開表態", "plot:贏得支持", "plot:才能展現", "plot:扭轉局勢", "plot:意外曝光"],
    forbid_pool: ["plot:信譽崩潰", "plot:遭到背叛"],
    text_template: "鎂光燈打下來的時候，你只有一個念頭：{內心OS}。{周圍人物}全都看著你，眼神裡是崇拜，或者嫉妒，或者兩者都有。管他的——聚光燈就是你的，至少現在是。"
  },
  {
    id: "ending_followers",
    name: "百萬追隨者",
    type: "正向",
    genres: ["搞笑"],
    tag_pool: ["plot:意外曝光", "plot:公開表態", "plot:才能展現", "plot:贏得支持", "plot:引起誤會"],
    forbid_pool: ["plot:信譽崩潰"],
    text_template: "你的{裝置}螢幕根本滑不完。你做的那件事不知道什麼時候被截圖放上去，然後傳開了，然後爆了。{評語}的內容你看得眼皮跳。你把手機翻過去，深呼吸——你需要一個{應對方式}。"
  },
  {
    id: "ending_legacy",
    name: "被人紀念的一生",
    type: "正向",
    genres: ["生存", "推理", "宮鬥"],
    tag_pool: ["plot:慷慨赴死", "plot:真相留存", "plot:扭轉局勢", "plot:完成任務", "plot:取得關鍵證據"],
    forbid_pool: ["plot:真相湮滅"],
    text_template: "多年以後，{後來者}在{地點描述}找到了你留下的{遺物}。沒有人記得你的名字，但他們知道那個{時代}曾有一個人做了一件正確的事。{遺物}被小心地放好，你沒有留下解釋，事情本身就是解釋。"
  },
  {
    id: "ending_truth",
    name: "查明真相",
    type: "正向",
    genres: ["推理"],
    tag_pool: ["plot:取得關鍵證據", "plot:識破謊言", "plot:逼出供詞", "plot:審訊完成", "plot:確認嫌疑人"],
    forbid_pool: ["plot:證據被毀"],
    text_template: "你把{證據}攤在{對象}面前，一字不發。{沉默}持續了很長時間。最後，{對象}的{神情}崩了，說出了那句話。所有拼圖在你腦中喀哒一聲落定——就是這樣。原來一切，都是這樣。"
  },

  // ─────────────────────────────────────────────
  // 負向結局（9個）
  // ─────────────────────────────────────────────
  {
    id: "ending_death",
    name: "死亡",
    type: "負向",
    genres: ["恐怖", "生存"],
    tag_pool: ["plot:受致命傷", "plot:退路截斷", "plot:求救失敗", "plot:暴露行蹤"],
    forbid_pool: ["plot:找到出路"],
    // 替換 text_template
    text_template: "你倒下的時候，{地點描述}的{環境細節}還在{動作}。某種奇異的、徹底的平靜爬上來——不是解脫，只是結束。你最後看見的，是{最後所見}，然後連那個也消失了。"
  },
  {
    id: "ending_madness",
    name: "瘋狂",
    type: "負向",
    genres: ["恐怖", "推理"],
    tag_pool: ["plot:目睹禁忌", "plot:精神動搖", "plot:求救失敗", "plot:時間錯亂", "plot:意識模糊"],
    forbid_pool: ["plot:心結化解"],
    text_template: "後來的事你不記得了。你只記得{觸發事件}的那個{時間}，以及之後那雙{恐怖意象}。他們在{地點描述}找到你的時候，你正在說{你在說的話}，嘴裡唸著什麼，連你自己也不知道那是什麼意思。"
  },
  {
    id: "ending_helpless",
    name: "無能為力",
    type: "負向",
    genres: ["恐怖", "生存", "推理"],
    tag_pool: ["plot:退路截斷", "plot:求救失敗", "plot:證據被毀", "plot:真相湮滅"],
    forbid_pool: [],
    text_template: "你試過了所有方法。你坐下來，把{道具}放到地上，閉上眼睛。有些事，不是努力就能改變的。{地點描述}的{環境細節}沒有給你任何答案——它只是繼續存在著，像什麼都沒有發生過。"
  },
  {
    id: "ending_collapse",
    name: "一敗塗地",
    type: "負向",
    genres: ["宮鬥", "推理"],
    tag_pool: ["plot:計謀敗露", "plot:遭到背叛", "plot:信譽崩潰", "plot:搞砸計畫"],
    forbid_pool: ["plot:扭轉局勢"],
    text_template: "{對象}把你的{計謀殘骸}一一列舉出來，每說一條，{人群}就安靜一分。你站在{場所}中央，沒有人過來。你很清楚——結束了。有些失敗不需要最後一擊，它在更早之前就已經決定了。"
  },
  {
    id: "ending_shame",
    name: "無臉見人",
    type: "負向",
    genres: ["宮鬥", "搞笑"],
    tag_pool: ["plot:醜事曝光", "plot:信譽崩潰", "plot:意外曝光", "plot:搞砸計畫"],
    forbid_pool: ["plot:扭轉局勢"],
    text_template: "那段傳言已經傳遍了整個{場所}。你縮在{藏身處}，把{遮蔽物}拉到臉上，試圖讓自己消失。外面有人在討論，你聽見自己的名字——伴隨著{評語}。你的{裝置}震個不停，你把它翻面，扣在地上。"
  },
  {
    id: "ending_prison",
    name: "鋃鐺入獄",
    type: "負向",
    genres: ["宮鬥", "推理"],
    tag_pool: ["plot:罪行確認", "plot:計謀敗露", "plot:遭到背叛", "plot:謀逆證據確立"],
    forbid_pool: ["plot:證據被毀"],
    text_template: "{腳鐐聲}在{走廊}迴盪。你低著頭，視線落在自己的{鞋}上，身旁的{押送者}沒有說話。你想起出發前還覺得這個計畫{形容詞}——你想起得太清楚了。{牢門}在你身後關上，發出一聲沉悶的扣響。"
  },
  {
    id: "ending_silenced",
    name: "被滅口",
    type: "負向",
    genres: ["推理", "恐怖"],
    tag_pool: ["plot:取得關鍵證據", "plot:暴露行蹤", "plot:退路截斷", "plot:真相湮滅"],
    forbid_pool: ["plot:找到出路", "plot:真相留存"],
    text_template: "你來不及說出那句話。{地點描述}很快就沉默了，只剩下{環境聲音}。{關鍵證據}從你手中滑落，落進{黑暗之處}。多年後沒有人記得你調查過什麼——這個案子，永遠是懸案。"
  },
  {
    id: "ending_purge",
    name: "株連九族",
    type: "負向",
    genres: ["宮鬥"],
    tag_pool: ["plot:謀逆證據確立", "plot:計謀敗露", "plot:遭到背叛", "plot:審訊完成", "plot:罪行確認"],
    forbid_pool: ["plot:扭轉局勢"],
    text_template: "聖旨念完的時候，{場所}裡沒有一點聲音。你跪在{地面材質}上，腦中一片空白。不知道是誰先哭出聲來——然後到處都是{哭聲}。你想說什麼，但嘴唇只是動了動。你帶下去的，不只是你自己。"
  },
  {
    id: "ending_sacrifice",
    name: "慘烈犧牲",
    type: "負向",
    genres: ["生存", "宮鬥"],
    tag_pool: ["plot:慷慨赴死", "plot:擊退威脅", "plot:退路截斷"],
    forbid_pool: ["plot:找到出路"],
    text_template: "你推開{對象}的時候，就知道自己回不來了。{衝擊}打在你身上，你聽見{對象}在遠處喊你的名字，聲音越來越遠。這很痛，但比你想的要短——你沒來得及後悔，然後什麼都沒有了。"
  },

  // ─────────────────────────────────────────────
  // 中性/灰色結局（6個）
  // ─────────────────────────────────────────────
  {
    id: "ending_dream",
    name: "夢一場",
    type: "中性",
    genres: ["恐怖", "搞笑", "戀愛"],
    tag_pool: ["plot:意識模糊", "plot:時間錯亂", "plot:精神動搖"],
    forbid_pool: [],
    text_template: "你睜開眼，{天花板}。你坐起來，{地點描述}一切如常，{日常細節}擺在原處。你試圖回想，但{記憶}已經在退去——你只記得一個{殘像}，然後連那個也消失了。也許什麼都沒發生過，也許發生了但不重要了。"
  },
  {
    id: "ending_unknown",
    name: "默默無名",
    type: "中性",
    genres: ["生存", "推理"],
    tag_pool: ["plot:完成任務", "plot:真相留存", "plot:找到出路"],
    forbid_pool: ["plot:公開表態", "plot:贏得支持"],
    text_template: "事情解決了。你站在{地點描述}，沒有人拍你肩膀，沒有人說謝謝。人群已經散去，{場所}回到它本來的樣子。你把{道具A}收好，轉身離開。沒有人知道你做過什麼——這或許正是你想要的。"
  },
  {
    id: "ending_ignored",
    name: "無人在意",
    type: "中性",
    genres: ["搞笑", "宮鬥"],
    tag_pool: ["plot:公開表態", "plot:搞砸計畫", "plot:引起誤會"],
    forbid_pool: ["plot:贏得支持", "plot:信譽崩潰"],
    text_template: "你說完了。{場所}裡的人繼續做他們的事。你清了清喉嚨，又試了一次。還是沒有人理你。你慢慢把{道具A}放下，在心裡默默計算今天已經{丟臉次數}次了。"
  },
  {
    id: "ending_numb",
    name: "放棄思考",
    type: "中性",
    genres: ["恐怖", "推理"],
    tag_pool: ["plot:目睹禁忌", "plot:精神動搖", "plot:放棄思考"],
    forbid_pool: ["plot:心結化解", "plot:查明真相"],
    text_template: "你不想弄清楚了。你在{地點描述}找了個{休憩處}坐下來，看著{景象}發呆。{時間流逝}，你什麼都沒有想。這感覺出奇地好——不是幸福，只是終於不再用力了。"
  },
  {
    id: "ending_mundane",
    name: "平淡無事",
    type: "中性",
    genres: ["搞笑", "戀愛"],
    tag_pool: ["plot:完成任務", "plot:誤會解開"],
    forbid_pool: ["plot:扭轉局勢", "plot:告白成功", "plot:心結化解"],
    text_template: "就這樣結束了。你走回{地點描述}，{形容詞}地坐下來。今天發生的事回想起來有點像夢，但你的{生理反應}告訴你那是真的。你打開{裝置}，心想——嗯，明天應該又是普通的一天。"
  },
  {
    id: "ending_anticlimactic",
    name: "草草了結",
    type: "中性",
    genres: ["全劇情類型"],
    // 兜底結局：無條件，不需要任何 require_tags
    tag_pool: [],
    forbid_pool: [],
    text_template: "事情就這樣結束了。你說不上來是怎麼結束的，或者為什麼。{地點描述}還是{地點描述}，{環境細節}還在那裡，好像什麼都沒發生過。你整理了一下，轉身走了——有些故事，沒有漂亮的句點，這是其中之一。"
  },
];

// ─────────────────────────────────────────────
// 各劇情類型可用結局池（id 清單）
// ─────────────────────────────────────────────
export const GENRE_ENDING_POOL = {
  "恐怖": ["ending_survival", "ending_death", "ending_madness", "ending_helpless",
    "ending_silenced", "ending_dream", "ending_numb", "ending_anticlimactic"],
  "戀愛": ["ending_happy", "ending_bliss", "ending_beautiful",
    "ending_dream", "ending_mundane", "ending_anticlimactic"],
  "推理": ["ending_truth", "ending_legacy", "ending_helpless", "ending_collapse",
    "ending_silenced", "ending_prison", "ending_numb", "ending_unknown", "ending_anticlimactic"],
  "宮鬥": ["ending_fame", "ending_star", "ending_legacy", "ending_collapse",
    "ending_shame", "ending_prison", "ending_purge", "ending_ignored", "ending_anticlimactic"],
  "搞笑": ["ending_happy", "ending_beautiful", "ending_fame", "ending_star",
    "ending_followers", "ending_shame", "ending_ignored", "ending_mundane",
    "ending_dream", "ending_anticlimactic"],
  "生存": ["ending_survival", "ending_beautiful", "ending_legacy", "ending_death",
    "ending_helpless", "ending_sacrifice", "ending_unknown", "ending_anticlimactic"],
};

// ─────────────────────────────────────────────
// 張力曲線偏向 → 結局 type 偏好
// ─────────────────────────────────────────────
export const CURVE_ENDING_BIAS = {
  "線性累積": ["正向"],
  "震盪起伏": ["正向", "負向"],
  "突然崩潰": ["負向", "中性"],
};

// ─────────────────────────────────────────────
// 快速查表：id → ending object
// ─────────────────────────────────────────────
export const ENDINGS_MAP = (() => {
  const map = {};
  ENDINGS.forEach(e => { map[e.id] = e; });
  return map;
})();
