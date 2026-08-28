/* The academy's branches, in one place so the admin panels and the public
   forms can't drift apart on spelling or ordering. */
export var BRANCHES = [
    { id: "mansoura", label: "Mansoura" },
    { id: "talkha", label: "Talkha" },
    { id: "toril", label: "Toril – Baby Inn" },
    { id: "gzert-elward", label: "Gzert-Elward Sport Club" },
    { id: "glow-international", label: "Glow International" },
    { id: "shoha", label: "Shoha Branch" },
    { id: "online", label: "Online" },
];

export function branchLabel(id) {
    if (!id) return "—";
    var found = BRANCHES.find(function (b) { return b.id === id; });
    return found ? found.label : id;
}
