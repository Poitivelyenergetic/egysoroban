import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

var firebaseConfig = {
    apiKey: "AIzaSyBO1uz4RGxrE5abjtdvoECvXmfx-CYEVBE",
    authDomain: "egysoroban-731cd.firebaseapp.com",
    projectId: "egysoroban-731cd",
    storageBucket: "egysoroban-731cd.firebasestorage.app",
    messagingSenderId: "474236789906",
    appId: "1:474236789906:web:d1abb574e3dbb9a5c7724b",
    measurementId: "G-3SQ5EWVVG1",
};
var firebaseApp = initializeApp(firebaseConfig);
var db = getFirestore(firebaseApp);
var auth = getAuth(firebaseApp);

(function () {
    "use strict";

    /* ============================================================
       TRANSLATIONS
       ============================================================ */
    var translations = {
        en: {
            "a11y.skip": "Skip to content",
            "nav.about": "About", "nav.programs": "Programs", "nav.journey": "How it works",
            "nav.stories": "Stories", "nav.faq": "FAQ", "nav.contact": "Contact", "nav.apply": "Apply now",
            "hero.eyebrow": "Soroban mental-math academy · Cairo",
            "hero.titleA": "Give your child a", "hero.titleAccent": "calculator in their mind",
            "hero.sub": "Egysoroban trains children ages 4–14 to add, subtract, multiply and divide by visualizing a Japanese abacus — building focus, memory and confidence one bead at a time.",
            "hero.ctaApply": "Apply for a free trial class", "hero.ctaPrograms": "See programs",
            "hero.meta1": "Age range", "hero.meta2": "Levels to master", "hero.meta3": "Cairo branches + online",
            "about.eyebrow": "About the academy",
            "about.title": "A calm, structured way into serious mental math",
            "about.p1": "Egysoroban is an example soroban academy built to show what Egysoroban's real site could look like — swap this copy for your own. In this sample, Egysoroban teaches children to calculate on a real wooden soroban first, then to picture that same abacus in their mind — a technique called Anzan. The physical tool disappears; the skill stays.",
            "about.p2": "Classes run in small groups of up to eight children, once a week, with short daily practice at home. Every student moves through eight structured levels at their own pace, from first counting beads to multiplying four-digit numbers entirely in their head.",
            "about.stat1": "Students currently enrolled", "about.stat2": "Years running in Cairo",
            "about.stat3": "Parents who renew each year", "about.stat4": "Certified instructors",
            "why.eyebrow": "Why soroban", "why.title": "What changes when a child trains this way",
            "why.lede": "Soroban training is a physical, visual and mental exercise at once — that combination is what shows up in the classroom, not just on a math test.",
            "why.c1t": "Sharper focus", "why.c1p": "Tracking beads across ten columns trains sustained attention — children carry that focus into homework and exams.",
            "why.c2t": "Stronger working memory", "why.c2p": "Visualizing the abacus (Anzan) exercises the same memory muscles used for reading comprehension and multi-step problems.",
            "why.c3t": "Real calculation speed", "why.c3p": "By Level 5, most students add and subtract multi-digit numbers faster mentally than on a phone calculator.",
            "why.c4t": "Visible confidence", "why.c4p": "Levels and belt-style exams give children frequent, concrete proof that practice is paying off.",
            "programs.eyebrow": "Programs", "programs.title": "Eight levels, one path",
            "programs.lede": "Every student is placed by a short free assessment, then moves level by level — each one built on the last, like place value on a soroban itself.",
            "programs.l1age": "Ages 4–6", "programs.l1title": "Little Sparks", "programs.l1desc": "First contact with numbers and the soroban: counting, number sense, and comfort holding the tool.",
            "programs.l2age": "Ages 7–9", "programs.l2title": "Foundation I–IV", "programs.l2desc": "Addition and subtraction mastery on the physical soroban, from single digits to large carries.",
            "programs.l3age": "Ages 9–12", "programs.l3title": "Advanced V–VIII", "programs.l3desc": "Multiplication, division, and the shift to Anzan — calculating on a soroban that only exists in the mind.",
            "programs.l4age": "Ages 10+", "programs.l4title": "Competition Track", "programs.l4desc": "Optional, by invitation once Level VI is complete — speed drills and entry to regional soroban competitions.",
            "programs.duration": "~3 months", "programs.durationLong": "~12 months", "programs.ongoing": "Ongoing",
            "programs.format1": "In-person", "programs.format2": "In-person / online",
            "journey.eyebrow": "How it works", "journey.title": "From application to first level exam",
            "journey.s1t": "Apply online", "journey.s1p": "Send your child's details through the form below — takes about two minutes.",
            "journey.s2t": "Free trial & assessment", "journey.s2p": "We call within 48 hours to book a free trial class and a short placement chat.",
            "journey.s3t": "Placed in a level", "journey.s3p": "Your child joins a small group matched to their age and starting point.",
            "journey.s4t": "Weekly class & practice", "journey.s4p": "One weekly session plus 10–15 minutes of guided practice at home.",
            "journey.s5t": "Level exam", "journey.s5p": "A short exam and certificate close each level before moving to the next.",
            "instructors.eyebrow": "Instructors", "instructors.title": "Example teaching team",
            "instructors.lede": "Sample profiles — replace with your real instructors' names, photos and credentials.",
            "instructors.role1": "Lead Instructor", "instructors.bio1": "Certified soroban trainer, 8 years teaching ages 4–12 across Maadi and Heliopolis branches.",
            "instructors.role2": "Advanced & Competition Coach", "instructors.bio2": "Runs the Competition Track; former national-level soroban competitor and Anzan specialist.",
            "instructors.role3": "Online Program Lead", "instructors.bio3": "Designs the online curriculum and leads live sessions for students outside Cairo.",
            "testimonials.eyebrow": "Parent stories", "testimonials.title": "Example testimonials",
            "testimonials.q1": "“My daughter used to freeze up at math homework. Eight months in, she does two-digit multiplication in her head before I finish reading the question.”",
            "testimonials.a1": "Mona K. — parent, Maadi branch",
            "testimonials.q2": "“The weekly rhythm is what made it stick for us — same day, same time, ten minutes of practice after dinner. No arguments.”",
            "testimonials.a2": "Ahmed S. — parent, Online program",
            "testimonials.q3": "“He's always been the quiet kid in class. The level exams gave him something to be visibly proud of.”",
            "testimonials.a3": "Heba M. — parent, Heliopolis branch",
            "faq.eyebrow": "Questions", "faq.title": "Frequently asked",
            "faq.q1": "What age can my child start?", "faq.a1": "We accept children from age 4 into Little Sparks. Most students who start soroban from scratch begin between ages 5 and 9.",
            "faq.q2": "Do you offer online classes?", "faq.a2": "Yes — Foundation and Advanced levels run live online in small groups, with the same curriculum and level exams as in-person branches.",
            "faq.q3": "How long until I see results?", "faq.a3": "Most parents notice a change in focus and speed within the first two levels — typically 4 to 6 months of steady weekly classes.",
            "faq.q4": "How big are the classes?", "faq.a4": "Up to eight students per group, or one-on-one for the online program on request.",
            "faq.q5": "Is there a free trial?", "faq.a5": "Yes — every application includes one free trial class and a placement chat before you commit to a level.",
            "apply.eyebrow": "Apply to join", "apply.title": "Start with a free trial class",
            "apply.lede": "Tell us about your child below. We reply within 48 hours to book a free trial and placement chat — no payment needed to apply.",
            "apply.b1": "Takes about two minutes to fill in", "apply.b2": "We call or email within 48 hours", "apply.b3": "Free trial class before any commitment",
            "apply.fStudentName": "Student's full name", "apply.fAge": "Student's age", "apply.fGrade": "Grade / school year",
            "apply.optional": "(optional)", "apply.fParentName": "Parent / guardian name", "apply.fPhone": "Phone number", "apply.fEmail": "Email address",
            "apply.errRequired": "This field is required.", "apply.errEmail": "Enter a valid email address.",
            "apply.fProgram": "Preferred program", "apply.optNotSure": "Not sure — need assessment",
            "apply.fFormat": "Preferred format", "apply.optInPerson": "In-person branch", "apply.optOnline": "Online",
            "apply.fBranch": "Preferred branch", "apply.optAny": "Any / not sure",
            "apply.fExperience": "Prior soroban / math experience", "apply.optExpNone": "None", "apply.optExpSome": "Some, self-taught", "apply.optExpSwitch": "Switching from another academy",
            "apply.fHeard": "How did you hear about us?", "apply.optSelect": "Select one", "apply.optSocial": "Social media",
            "apply.optFriend": "Friend or family", "apply.optSearch": "Online search", "apply.optSchool": "School", "apply.optOther": "Other",
            "apply.fGoals": "Goals or notes for us", "apply.submit": "Submit application", "apply.submitting": "Sending…",
            "apply.privacyNote": "Your details are only used to contact you about joining Egysoroban.",
            "apply.successOnline": "Thank you! Your application has been received and saved — we'll contact you within 48 hours.",
            "apply.fallbackTitle": "Almost there — one more click",
            "apply.fallbackMsg": "This page can't save applications automatically right now, so send yours by email instead — your details are already filled in.",
            "apply.fallbackBtn": "Send application by email",
            "contact.eyebrow": "Get in touch", "contact.title": "Questions before you apply?",
            "contact.phoneLabel": "Phone / WhatsApp", "contact.emailLabel": "Email",
            "contact.branchesLabel": "Branches", "contact.branchesValue": "Maadi · Heliopolis · New Cairo — plus online classes",
            "contact.hoursLabel": "Office hours", "contact.hoursValue": "Saturday–Thursday, 10:00–18:00",
            "contact.mapNote": "14 Nour Street, Maadi, Cairo — map preview placeholder",
            "footer.blurb": "An example soroban mental-arithmetic academy site — swap this text, the programs and the contact details for your own before publishing to families.",
            "footer.explore": "Explore", "footer.contact": "Contact", "footer.copy": "© 2026 Egysoroban — example academy site",
            "footer.staffLogin": "Staff login",
            "admin.gateTitle": "Staff login", "admin.gateLede": "Enter the admin password to view submitted applications.",
            "admin.passwordLabel": "Password", "admin.loginBtn": "View applications", "admin.wrongPassword": "That password isn't right. Try again.",
            "admin.gateHint": "This is a light front-door lock for staff convenience, not full security — anyone with real edit access to this page can still change its data regardless of this password.",
            "admin.dashTitle": "Egysoroban admin", "admin.refresh": "Refresh", "admin.export": "Export JSON", "admin.logout": "Log out",
            "admin.sumTotal": "Total applications", "admin.sumNew": "New", "admin.sumContacted": "Contacted", "admin.sumEnrolled": "Enrolled",
            "admin.manualAddTitle": "+ Log an application received by phone or email", "admin.manualAddSubmit": "Add to list",
            "admin.searchPlaceholder": "Search by name, parent or phone",
            "admin.filterAll": "All statuses", "admin.statusNew": "New", "admin.statusContacted": "Contacted", "admin.statusEnrolled": "Enrolled", "admin.statusDeclined": "Declined",
            "admin.colStudent": "Student", "admin.colParent": "Parent", "admin.colProgram": "Program", "admin.colSubmitted": "Submitted", "admin.colStatus": "Status",
            "admin.emptyList": "No applications yet — they'll show up here as families apply.",
            "admin.noResults": "No applications match your search or filter.",
            "admin.addedToast": "Application added.", "admin.savedToast": "Changes saved.", "admin.deletedToast": "Application removed.",
            "admin.exportedOk": "Export ready — check your downloads.", "admin.exportUnavailable": "Export isn't available in this view.", "admin.exportFailed": "Couldn't export right now — try again.",
            "admin.refreshedToast": "List refreshed.", "admin.savingFailedToast": "Couldn't save that change — this view may be read-only.",
            "admin.confirmDelete": "Click again to confirm delete", "admin.readOnlyNote": "This view can't save changes — you may be viewing a read-only copy of this page. Ask the owner to share it with edit access.",
            "detail.title": "Application details", "detail.student": "Student", "detail.age": "Age", "detail.grade": "Grade / school year",
            "detail.parent": "Parent / guardian", "detail.phone": "Phone", "detail.email": "Email", "detail.program": "Preferred program",
            "detail.format": "Preferred format", "detail.branch": "Preferred branch", "detail.experience": "Prior experience",
            "detail.heard": "Heard about us via", "detail.goals": "Goals / notes from parent", "detail.submitted": "Submitted",
            "detail.source": "Source", "detail.sourcePublic": "Public application form", "detail.sourceManual": "Logged manually by staff",
            "detail.status": "Status", "detail.internalNotes": "Internal notes (staff only)", "detail.save": "Save changes",
            "detail.delete": "Delete application", "detail.close": "Close", "detail.none": "—",
        },
        ar: {
            "a11y.skip": "تخطَّ إلى المحتوى",
            "nav.about": "عن الأكاديمية", "nav.programs": "البرامج", "nav.journey": "كيف نعمل",
            "nav.stories": "آراء أولياء الأمور", "nav.faq": "الأسئلة الشائعة", "nav.contact": "تواصل معنا", "nav.apply": "قدّم الآن",
            "hero.eyebrow": "أكاديمية السوروبان للحساب الذهني · القاهرة",
            "hero.titleA": "امنح طفلك", "hero.titleAccent": "آلة حاسبة داخل عقله",
            "hero.sub": "تُدرّب إيجي سوروبان الأطفال من سن 4 إلى 14 عامًا على الجمع والطرح والضرب والقسمة من خلال تخيّل العداد الياباني (السوروبان) — لبناء التركيز والذاكرة والثقة، خرزة تلو الأخرى.",
            "hero.ctaApply": "قدّم للحصول على حصة تجريبية مجانية", "hero.ctaPrograms": "استعرض البرامج",
            "hero.meta1": "الفئة العمرية", "hero.meta2": "مستويات للإتقان", "hero.meta3": "فروع بالقاهرة + عبر الإنترنت",
            "about.eyebrow": "عن الأكاديمية",
            "about.title": "طريق هادئ ومنظّم نحو حساب ذهني حقيقي",
            "about.p1": "إيجي سوروبان نموذج توضيحي لأكاديمية سوروبان، أُعدّ ليُظهر شكل موقعك الحقيقي — استبدلي هذا النص ببياناتكِ الخاصة. في هذا النموذج، تُعلّم إيجي سوروبان الأطفال الحساب أولًا على عداد سوروبان خشبي حقيقي، ثم تخيّل العداد نفسه في الذهن — وهي تقنية تُعرف باسم «أنزان». تختفي الأداة المادية، وتبقى المهارة.",
            "about.p2": "تُقام الحصص في مجموعات صغيرة تصل إلى ثمانية أطفال، مرة أسبوعيًا، مع تمرين قصير يوميًا في المنزل. يمر كل طالب بثمانية مستويات منظّمة وفق وتيرته الخاصة، من عدّ الخرز الأول إلى ضرب أرقام من أربع خانات ذهنيًا بالكامل.",
            "about.stat1": "طالبًا مسجّلًا حاليًا", "about.stat2": "سنوات من العمل في القاهرة",
            "about.stat3": "من أولياء الأمور يجدّدون الاشتراك كل عام", "about.stat4": "مدربين معتمدين",
            "why.eyebrow": "لماذا السوروبان", "why.title": "ماذا يتغيّر عندما يتدرّب الطفل بهذه الطريقة",
            "why.lede": "تدريب السوروبان تمرين جسدي وبصري وذهني في آنٍ واحد — وهذا المزيج هو ما ينعكس داخل الفصل الدراسي، لا في اختبار الرياضيات فقط.",
            "why.c1t": "تركيز أعلى", "why.c1p": "متابعة الخرز عبر عشرة أعمدة تُدرّب الانتباه المستمر — ويحمل الطفل هذا التركيز معه إلى الواجبات والامتحانات.",
            "why.c2t": "ذاكرة عاملة أقوى", "why.c2p": "تخيّل العداد (أنزان) يُشغّل نفس عضلات الذاكرة المستخدمة في فهم المقروء وحل المسائل متعددة الخطوات.",
            "why.c3t": "سرعة حساب حقيقية", "why.c3p": "بحلول المستوى الخامس، يجمع معظم الطلاب ويطرحون أرقامًا متعددة الخانات ذهنيًا أسرع من الآلة الحاسبة في الهاتف.",
            "why.c4t": "ثقة ملموسة", "why.c4p": "تمنح المستويات والاختبارات الدورية الطفل دليلًا واقعيًا ومتكررًا على أن التمرين يُثمر.",
            "programs.eyebrow": "البرامج", "programs.title": "ثمانية مستويات، مسار واحد",
            "programs.lede": "يُوضع كل طالب في مستواه بعد تقييم مجاني قصير، ثم يتقدّم مستوى تلو الآخر — كل مستوى مبني على سابقه، تمامًا كالقيمة المكانية في السوروبان نفسه.",
            "programs.l1age": "من 4 إلى 6 سنوات", "programs.l1title": "الشرارات الصغيرة", "programs.l1desc": "أول تعامل مع الأرقام والسوروبان: العدّ، الحس العددي، والتآلف مع الأداة.",
            "programs.l2age": "من 7 إلى 9 سنوات", "programs.l2title": "الأساسي I–IV", "programs.l2desc": "إتقان الجمع والطرح على السوروبان الفعلي، من الآحاد إلى العمليات ذات الحمل الكبير.",
            "programs.l3age": "من 9 إلى 12 سنة", "programs.l3title": "المتقدم V–VIII", "programs.l3desc": "الضرب والقسمة، والانتقال إلى «أنزان» — الحساب على سوروبان لا وجود له إلا في الذهن.",
            "programs.l4age": "10 سنوات فأكثر", "programs.l4title": "مسار المسابقات", "programs.l4desc": "اختياري وبالدعوة بعد إتمام المستوى السادس — تدريبات سرعة والمشاركة في مسابقات سوروبان إقليمية.",
            "programs.duration": "نحو 3 أشهر", "programs.durationLong": "نحو 12 شهرًا", "programs.ongoing": "مستمر",
            "programs.format1": "حضوري", "programs.format2": "حضوري / عبر الإنترنت",
            "journey.eyebrow": "كيف نعمل", "journey.title": "من التقديم إلى اختبار المستوى الأول",
            "journey.s1t": "قدّم عبر الموقع", "journey.s1p": "أرسلي بيانات طفلك عبر النموذج أدناه — يستغرق ذلك نحو دقيقتين.",
            "journey.s2t": "حصة تجريبية وتقييم مجانيان", "journey.s2p": "نتصل خلال 48 ساعة لحجز حصة تجريبية مجانية ومحادثة قصيرة لتحديد المستوى.",
            "journey.s3t": "التحاق بمستوى مناسب", "journey.s3p": "ينضم طفلك إلى مجموعة صغيرة تناسب عمره ومستواه.",
            "journey.s4t": "حصة أسبوعية وتمرين", "journey.s4p": "حصة واحدة أسبوعيًا، مع 10 إلى 15 دقيقة من التمرين الموجّه في المنزل.",
            "journey.s5t": "اختبار المستوى", "journey.s5p": "اختبار قصير وشهادة يُختتم بهما كل مستوى قبل الانتقال إلى التالي.",
            "instructors.eyebrow": "المدربون", "instructors.title": "نموذج لفريق التدريس",
            "instructors.lede": "بيانات توضيحية — استبدليها بأسماء وصور ومؤهلات مدربيكِ الفعليين.",
            "instructors.role1": "المدرّبة الرئيسية", "instructors.bio1": "مدرّبة سوروبان معتمدة، بخبرة 8 سنوات في تدريس الأعمار من 4 إلى 12 عامًا بفرعي المعادي وهليوبوليس.",
            "instructors.role2": "مدرّب المستوى المتقدم والمسابقات", "instructors.bio2": "يقود مسار المسابقات؛ متسابق سوروبان سابق على المستوى الوطني ومتخصص في «أنزان».",
            "instructors.role3": "مسؤولة البرنامج الإلكتروني", "instructors.bio3": "تصمم المنهج الإلكتروني وتقود الحصص المباشرة للطلاب خارج القاهرة.",
            "testimonials.eyebrow": "آراء أولياء الأمور", "testimonials.title": "شهادات توضيحية",
            "testimonials.q1": "«كانت ابنتي تتجمّد أمام واجب الرياضيات. بعد ثمانية أشهر، أصبحت تضرب رقمين من خانتين ذهنيًا قبل أن أنهي قراءة السؤال.»",
            "testimonials.a1": "منى ك. — ولية أمر، فرع المعادي",
            "testimonials.q2": "«الانتظام الأسبوعي هو ما جعل الأمر يترسّخ عندنا — نفس اليوم، نفس الموعد، وعشر دقائق تمرين بعد العشاء. بلا جدال.»",
            "testimonials.a2": "أحمد س. — ولي أمر، البرنامج الإلكتروني",
            "testimonials.q3": "«كان دائمًا الطفل الهادئ في الفصل. اختبارات المستويات منحته شيئًا يفخر به بوضوح.»",
            "testimonials.a3": "هبة م. — ولية أمر، فرع هليوبوليس",
            "faq.eyebrow": "أسئلتكم", "faq.title": "الأسئلة الأكثر شيوعًا",
            "faq.q1": "في أي سنّ يمكن لطفلي أن يبدأ؟", "faq.a1": "نستقبل الأطفال من سن 4 أعوام في برنامج الشرارات الصغيرة. يبدأ معظم الطلاب الذين لم يجربوا السوروبان من قبل بين سن 5 و9 أعوام.",
            "faq.q2": "هل تقدّمون حصصًا عبر الإنترنت؟", "faq.a2": "نعم — تُقام مستويات الأساسي والمتقدم مباشرة عبر الإنترنت في مجموعات صغيرة، بنفس المنهج واختبارات المستويات كالفروع الحضورية.",
            "faq.q3": "متى تظهر النتائج؟", "faq.a3": "يلاحظ معظم أولياء الأمور تحسّنًا في التركيز والسرعة خلال أول مستويين — عادةً بعد 4 إلى 6 أشهر من الحضور الأسبوعي المنتظم.",
            "faq.q4": "ما حجم المجموعات؟", "faq.a4": "حتى ثمانية طلاب في المجموعة الواحدة، أو حصص فردية للبرنامج الإلكتروني عند الطلب.",
            "faq.q5": "هل توجد حصة تجريبية مجانية؟", "faq.a5": "نعم — يتضمن كل طلب التحاق حصة تجريبية مجانية ومحادثة لتحديد المستوى قبل أي التزام.",
            "apply.eyebrow": "التقديم للالتحاق", "apply.title": "ابدئي بحصة تجريبية مجانية",
            "apply.lede": "أخبرينا عن طفلك في النموذج أدناه. نرد خلال 48 ساعة لحجز الحصة التجريبية ومحادثة تحديد المستوى — لا حاجة لأي دفع للتقديم.",
            "apply.b1": "يستغرق التعبئة نحو دقيقتين", "apply.b2": "نتصل أو نراسلكِ خلال 48 ساعة", "apply.b3": "حصة تجريبية مجانية قبل أي التزام",
            "apply.fStudentName": "اسم الطالب كاملًا", "apply.fAge": "عمر الطالب", "apply.fGrade": "الصف / المرحلة الدراسية",
            "apply.optional": "(اختياري)", "apply.fParentName": "اسم ولي/ة الأمر", "apply.fPhone": "رقم الهاتف", "apply.fEmail": "البريد الإلكتروني",
            "apply.errRequired": "هذا الحقل مطلوب.", "apply.errEmail": "أدخلي بريدًا إلكترونيًا صحيحًا.",
            "apply.fProgram": "البرنامج المفضّل", "apply.optNotSure": "غير محدد — بحاجة إلى تقييم",
            "apply.fFormat": "طريقة الحضور المفضّلة", "apply.optInPerson": "حضوري في أحد الفروع", "apply.optOnline": "عبر الإنترنت",
            "apply.fBranch": "الفرع المفضّل", "apply.optAny": "أي فرع / غير محدد",
            "apply.fExperience": "خبرة سابقة بالسوروبان أو الحساب", "apply.optExpNone": "لا توجد", "apply.optExpSome": "بعض الخبرة الذاتية", "apply.optExpSwitch": "انتقال من أكاديمية أخرى",
            "apply.fHeard": "كيف سمعتِ عنّا؟", "apply.optSelect": "اختاري", "apply.optSocial": "مواقع التواصل الاجتماعي",
            "apply.optFriend": "صديق أو أحد الأقارب", "apply.optSearch": "بحث عبر الإنترنت", "apply.optSchool": "المدرسة", "apply.optOther": "أخرى",
            "apply.fGoals": "أهداف أو ملاحظات لنا", "apply.submit": "إرسال الطلب", "apply.submitting": "جارٍ الإرسال…",
            "apply.privacyNote": "تُستخدم بياناتكِ فقط للتواصل معكِ بخصوص الالتحاق بإيجي سوروبان.",
            "apply.successOnline": "شكرًا لكِ! وصل طلبكِ وتم حفظه — سنتواصل معكِ خلال 48 ساعة.",
            "apply.fallbackTitle": "خطوة أخيرة",
            "apply.fallbackMsg": "لا يمكن لهذه الصفحة حفظ الطلبات تلقائيًا الآن، لذا أرسلي طلبكِ عبر البريد الإلكتروني بدلًا من ذلك — بياناتكِ معبّأة بالفعل.",
            "apply.fallbackBtn": "إرسال الطلب عبر البريد الإلكتروني",
            "contact.eyebrow": "تواصلي معنا", "contact.title": "أسئلة قبل التقديم؟",
            "contact.phoneLabel": "الهاتف / واتساب", "contact.emailLabel": "البريد الإلكتروني",
            "contact.branchesLabel": "الفروع", "contact.branchesValue": "المعادي · هليوبوليس · القاهرة الجديدة — بالإضافة إلى الحصص الإلكترونية",
            "contact.hoursLabel": "ساعات العمل", "contact.hoursValue": "السبت–الخميس، 10:00–18:00",
            "contact.mapNote": "14 شارع نور، المعادي، القاهرة — نموذج توضيحي لموقع الخريطة",
            "footer.blurb": "نموذج توضيحي لموقع أكاديمية سوروبان — استبدلي هذا النص والبرامج وبيانات التواصل ببياناتكِ الفعلية قبل نشر الموقع للعائلات.",
            "footer.explore": "استكشفي", "footer.contact": "تواصلي", "footer.copy": "© 2026 إيجي سوروبان — نموذج توضيحي",
            "footer.staffLogin": "دخول الموظفين",
            "admin.gateTitle": "دخول الموظفين", "admin.gateLede": "أدخلي كلمة مرور الإدارة لعرض الطلبات المُقدَّمة.",
            "admin.passwordLabel": "كلمة المرور", "admin.loginBtn": "عرض الطلبات", "admin.wrongPassword": "كلمة المرور غير صحيحة. حاولي مجددًا.",
            "admin.gateHint": "هذا مجرد قفل بسيط لراحة الموظفين، وليس حماية كاملة — أي شخص لديه صلاحية تعديل فعلية على هذه الصفحة يمكنه تغيير بياناتها بغضّ النظر عن كلمة المرور هذه.",
            "admin.dashTitle": "لوحة تحكم إيجي سوروبان", "admin.refresh": "تحديث", "admin.export": "تصدير JSON", "admin.logout": "تسجيل الخروج",
            "admin.sumTotal": "إجمالي الطلبات", "admin.sumNew": "جديد", "admin.sumContacted": "تم التواصل", "admin.sumEnrolled": "تم الالتحاق",
            "admin.manualAddTitle": "+ تسجيل طلب وصل عبر الهاتف أو البريد الإلكتروني", "admin.manualAddSubmit": "إضافة إلى القائمة",
            "admin.searchPlaceholder": "ابحثي بالاسم أو اسم ولي الأمر أو الهاتف",
            "admin.filterAll": "كل الحالات", "admin.statusNew": "جديد", "admin.statusContacted": "تم التواصل", "admin.statusEnrolled": "تم الالتحاق", "admin.statusDeclined": "معتذر",
            "admin.colStudent": "الطالب", "admin.colParent": "ولي الأمر", "admin.colProgram": "البرنامج", "admin.colSubmitted": "تاريخ التقديم", "admin.colStatus": "الحالة",
            "admin.emptyList": "لا توجد طلبات بعد — ستظهر هنا عند تقديم العائلات لها.",
            "admin.noResults": "لا توجد طلبات مطابقة لبحثكِ أو الفلتر المحدد.",
            "admin.addedToast": "تمت إضافة الطلب.", "admin.savedToast": "تم حفظ التغييرات.", "admin.deletedToast": "تم حذف الطلب.",
            "admin.exportedOk": "التصدير جاهز — تحققي من التنزيلات.", "admin.exportUnavailable": "التصدير غير متاح في هذا العرض.", "admin.exportFailed": "تعذّر التصدير الآن — حاولي مجددًا.",
            "admin.refreshedToast": "تم تحديث القائمة.", "admin.savingFailedToast": "تعذّر حفظ هذا التغيير — قد يكون هذا العرض للقراءة فقط.",
            "admin.confirmDelete": "اضغطي مجددًا لتأكيد الحذف", "admin.readOnlyNote": "لا يمكن لهذا العرض حفظ التغييرات — قد تشاهدين نسخة للقراءة فقط من هذه الصفحة. اطلبي من المالك مشاركتها بصلاحية تعديل.",
            "detail.title": "تفاصيل الطلب", "detail.student": "الطالب", "detail.age": "العمر", "detail.grade": "الصف / المرحلة الدراسية",
            "detail.parent": "ولي/ة الأمر", "detail.phone": "الهاتف", "detail.email": "البريد الإلكتروني", "detail.program": "البرنامج المفضّل",
            "detail.format": "طريقة الحضور", "detail.branch": "الفرع المفضّل", "detail.experience": "الخبرة السابقة",
            "detail.heard": "سمع عنّا عبر", "detail.goals": "أهداف / ملاحظات ولي الأمر", "detail.submitted": "تاريخ التقديم",
            "detail.source": "المصدر", "detail.sourcePublic": "نموذج التقديم العام", "detail.sourceManual": "أُدخل يدويًا من الموظفين",
            "detail.status": "الحالة", "detail.internalNotes": "ملاحظات داخلية (للموظفين فقط)", "detail.save": "حفظ التغييرات",
            "detail.delete": "حذف الطلب", "detail.close": "إغلاق", "detail.none": "—",
        }
    };

    /* ============================================================
       STATE
       ============================================================ */
    var ADMIN_LOGIN_EMAIL = "admin@egysoroban.app"; // the Firebase Auth user you create in the Firebase console for staff login
    var ADMIN_EMAIL = "hello@egysoroban.example"; // replace with the real inbox that should receive applications

    var state = {
        lang: "en",
        applications: [],
        adminOpen: false,
        isAdmin: false,
    };

    onAuthStateChanged(auth, function (user) {
        state.isAdmin = !!user;
    });

    try {
        var savedLang = localStorage.getItem("egysoroban_lang");
        if (savedLang === "en" || savedLang === "ar") state.lang = savedLang;
    } catch (e) { }

    function t(key, lang) {
        var l = lang || state.lang;
        var v = (translations[l] && translations[l][key]) || (translations.en && translations.en[key]);
        return v == null ? "" : v;
    }

    function fmtDate(iso) {
        try {
            var d = new Date(iso);
            return d.toLocaleDateString(state.lang === "ar" ? "ar-EG" : "en-GB", { year: "numeric", month: "short", day: "numeric" }) +
                " · " + d.toLocaleTimeString(state.lang === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" });
        } catch (e) { return iso || ""; }
    }

    /* ============================================================
       TOAST
       ============================================================ */
    var toastEl = document.getElementById("toast");
    var toastTimer = null;
    function toast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3400);
    }

    /* ============================================================
       LANGUAGE
       ============================================================ */
    function applyLanguage(lang) {
        state.lang = lang;
        try { localStorage.setItem("egysoroban_lang", lang); } catch (e) { }
        document.documentElement.setAttribute("lang", lang);
        document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
        document.documentElement.setAttribute("data-lang", lang);

        var nodes = document.querySelectorAll("[data-i18n]");
        for (var i = 0; i < nodes.length; i++) {
            var key = nodes[i].getAttribute("data-i18n");
            var val = t(key, lang);
            if (val) nodes[i].textContent = val;
        }
        var placeholders = document.querySelectorAll("[data-i18n-placeholder]");
        for (var j = 0; j < placeholders.length; j++) {
            var pkey = placeholders[j].getAttribute("data-i18n-placeholder");
            var pval = t(pkey, lang);
            if (pval) placeholders[j].setAttribute("placeholder", pval);
        }

        var langToggle = document.getElementById("lang-toggle");
        if (langToggle) langToggle.textContent = lang === "ar" ? "EN / عربي" : "عربي / EN";

        if (state.adminOpen) renderAdminDashboard();
    }

    var langToggleBtn = document.getElementById("lang-toggle");
    if (langToggleBtn) {
        langToggleBtn.addEventListener("click", function () {
            applyLanguage(state.lang === "ar" ? "en" : "ar");
        });
    }
    applyLanguage(state.lang);

    /* ============================================================
       MOBILE NAV
       ============================================================ */
    var navToggle = document.getElementById("nav-toggle");
    var mainNav = document.getElementById("main-nav");
    if (navToggle && mainNav) {
        navToggle.addEventListener("click", function () {
            var open = mainNav.classList.toggle("is-open");
            navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
        mainNav.querySelectorAll("a").forEach(function (a) {
            a.addEventListener("click", function () {
                mainNav.classList.remove("is-open");
                navToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    /* ============================================================
       FAQ ACCORDION
       ============================================================ */
    document.querySelectorAll(".faq-item").forEach(function (item) {
        var btn = item.querySelector(".faq-q");
        btn.addEventListener("click", function () {
            var isOpen = item.getAttribute("data-open") === "true";
            item.setAttribute("data-open", isOpen ? "false" : "true");
        });
    });

    /* ============================================================
       FIRESTORE — shared applications data
       Public visitors may only create applications (the apply form).
       Reading, updating and deleting requires a signed-in admin — see
       Firestore security rules in the Firebase console.
       ============================================================ */
    var applicationsCol = collection(db, "applications");

    async function loadApplications() {
        if (!state.isAdmin) return;
        try {
            var snap = await getDocs(applicationsCol);
            var list = [];
            snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
            state.applications = list;
        } catch (e) {
            /* likely a permissions error if not signed in yet — leave state as-is */
        }
    }

    async function addApplicationDoc(app) {
        try {
            var docRef = await addDoc(applicationsCol, app);
            var withId = Object.assign({ id: docRef.id }, app);
            state.applications = state.applications.concat([withId]);
            return { ok: true, app: withId };
        } catch (err) {
            return { ok: false, code: (err && err.code) || "upstream_error" };
        }
    }

    async function updateApplicationDoc(id, fields) {
        try {
            await updateDoc(doc(db, "applications", id), fields);
            state.applications = state.applications.map(function (a) {
                return a.id === id ? Object.assign({}, a, fields) : a;
            });
            return { ok: true };
        } catch (err) {
            return { ok: false, code: (err && err.code) || "upstream_error" };
        }
    }

    async function deleteApplicationDoc(id) {
        try {
            await deleteDoc(doc(db, "applications", id));
            state.applications = state.applications.filter(function (a) { return a.id !== id; });
            return { ok: true };
        } catch (err) {
            return { ok: false, code: (err && err.code) || "upstream_error" };
        }
    }

    function buildMailto(app) {
        var subject = "New Egysoroban application — " + (app.studentName || "");
        var lines = [
            "Student name: " + (app.studentName || "—"),
            "Age: " + (app.age || "—"),
            "Grade: " + (app.grade || "—"),
            "Parent/guardian: " + (app.parentName || "—"),
            "Phone: " + (app.phone || "—"),
            "Email: " + (app.email || "—"),
            "Preferred program: " + (app.program || "—"),
            "Preferred format: " + (app.format || "—"),
            "Preferred branch: " + (app.branch || "—"),
            "Prior experience: " + (app.experience || "—"),
            "Heard about us via: " + (app.heard || "—"),
            "Goals / notes: " + (app.goals || "—"),
        ];
        return "mailto:" + ADMIN_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
    }

    /* ============================================================
       APPLICATION FORM
       ============================================================ */
    var applyForm = document.getElementById("apply-form");
    var formStatus = document.getElementById("form-status");

    function clearFormErrors() {
        applyForm.querySelectorAll(".field.has-error").forEach(function (f) { f.classList.remove("has-error"); });
    }
    function markFieldError(input) {
        var field = input.closest(".field");
        if (field) field.classList.add("has-error");
    }
    function validateForm(fd) {
        var required = ["studentName", "age", "parentName", "phone", "email"];
        var firstInvalid = null;
        required.forEach(function (name) {
            var input = applyForm.querySelector('[name="' + name + '"]');
            var val = (fd.get(name) || "").toString().trim();
            if (!val) { markFieldError(input); if (!firstInvalid) firstInvalid = input; }
        });
        var emailInput = applyForm.querySelector('[name="email"]');
        var emailVal = (fd.get("email") || "").toString().trim();
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            markFieldError(emailInput);
            if (!firstInvalid) firstInvalid = emailInput;
        }
        return firstInvalid;
    }

    if (applyForm) {
        applyForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearFormErrors();
            formStatus.className = "form-status";
            formStatus.innerHTML = "";

            var fd = new FormData(applyForm);
            var invalid = validateForm(fd);
            if (invalid) { invalid.focus(); return; }

            var app = {
                studentName: (fd.get("studentName") || "").toString().trim(),
                age: (fd.get("age") || "").toString().trim(),
                grade: (fd.get("grade") || "").toString().trim(),
                parentName: (fd.get("parentName") || "").toString().trim(),
                phone: (fd.get("phone") || "").toString().trim(),
                email: (fd.get("email") || "").toString().trim(),
                program: (fd.get("program") || "").toString(),
                format: (fd.get("format") || "").toString(),
                branch: (fd.get("branch") || "").toString(),
                experience: (fd.get("experience") || "").toString(),
                heard: (fd.get("heard") || "").toString(),
                goals: (fd.get("goals") || "").toString().trim(),
                status: "new",
                notes: "",
                source: "public",
                submittedAt: new Date().toISOString(),
            };

            var submitBtn = document.getElementById("apply-submit");
            var originalLabel = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = t("apply.submitting");

            var result = await addApplicationDoc(app);

            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;

            if (result.ok) {
                formStatus.className = "form-status show ok";
                formStatus.textContent = t("apply.successOnline");
                applyForm.reset();
            } else {
                formStatus.className = "form-status show warn";
                formStatus.innerHTML = "";
                var msg = document.createElement("p");
                msg.style.margin = "0 0 4px";
                msg.textContent = t("apply.fallbackMsg");
                var link = document.createElement("a");
                link.className = "btn btn-jade";
                link.href = buildMailto(app);
                link.textContent = t("apply.fallbackBtn");
                formStatus.appendChild(msg);
                formStatus.appendChild(link);
            }
        });
    }

    /* ============================================================
       ADMIN
       ============================================================ */
    var adminOverlay = document.getElementById("admin-overlay");
    var adminGate = document.getElementById("admin-gate");
    var adminDash = document.getElementById("admin-dashboard");
    var adminPasswordInput = document.getElementById("admin-password");
    var adminLoginError = document.getElementById("admin-login-error");
    var detailOverlay = document.getElementById("detail-overlay");
    var detailCard = document.getElementById("detail-card");
    var adminSearchInput = document.getElementById("admin-search");
    var adminFilterSelect = document.getElementById("admin-filter-status");
    var deletePending = null;

    function openAdminOverlay() {
        adminOverlay.hidden = false;
        if (state.isAdmin) {
            showAdminDashboard();
        } else {
            adminGate.hidden = false;
            adminDash.hidden = true;
            adminPasswordInput.value = "";
            adminLoginError.classList.remove("show");
            setTimeout(function () { adminPasswordInput.focus(); }, 50);
        }
    }
    function closeAdminOverlay() {
        adminOverlay.hidden = true;
    }
    async function showAdminDashboard() {
        adminGate.hidden = true;
        adminDash.hidden = false;
        state.adminOpen = true;
        await loadApplications();
        renderAdminDashboard();
    }

    document.getElementById("open-admin").addEventListener("click", openAdminOverlay);
    document.getElementById("admin-gate-close").addEventListener("click", closeAdminOverlay);
    document.getElementById("admin-dash-close").addEventListener("click", closeAdminOverlay);
    adminOverlay.addEventListener("click", function (e) {
        if (e.target === adminOverlay) closeAdminOverlay();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            if (!detailOverlay.hidden) closeDetail();
            else if (!adminOverlay.hidden) closeAdminOverlay();
        }
    });

    document.getElementById("admin-login-form").addEventListener("submit", async function (e) {
        e.preventDefault();
        var loginBtn = document.querySelector('#admin-login-form button[type="submit"]');
        if (loginBtn) loginBtn.disabled = true;
        try {
            await signInWithEmailAndPassword(auth, ADMIN_LOGIN_EMAIL, adminPasswordInput.value);
            adminLoginError.classList.remove("show");
            showAdminDashboard();
        } catch (err) {
            adminLoginError.classList.add("show");
            adminPasswordInput.value = "";
            adminPasswordInput.focus();
        }
        if (loginBtn) loginBtn.disabled = false;
    });

    document.getElementById("admin-logout").addEventListener("click", async function () {
        try { await signOut(auth); } catch (e) { }
        state.adminOpen = false;
        closeAdminOverlay();
    });

    document.getElementById("admin-refresh").addEventListener("click", async function () {
        await loadApplications();
        renderAdminDashboard();
        toast(t("admin.refreshedToast"));
    });

    function statusLabel(status) {
        var key = "admin.status" + (status ? status.charAt(0).toUpperCase() + status.slice(1) : "New");
        return t(key);
    }
    function programLabel(program) {
        var map = { "little-sparks": "programs.l1title", "foundation": "programs.l2title", "advanced": "programs.l3title", "unsure": "apply.optNotSure" };
        return map[program] ? t(map[program]) : (program || t("detail.none"));
    }

    function filteredApplications() {
        var q = (adminSearchInput.value || "").trim().toLowerCase();
        var statusFilter = adminFilterSelect.value;
        return state.applications
            .filter(function (a) {
                if (statusFilter && a.status !== statusFilter) return false;
                if (!q) return true;
                var hay = [a.studentName, a.parentName, a.phone, a.email].join(" ").toLowerCase();
                return hay.indexOf(q) !== -1;
            })
            .sort(function (a, b) { return (b.submittedAt || "").localeCompare(a.submittedAt || ""); });
    }

    function renderAdminDashboard() {
        if (!state.adminOpen) return;
        var all = state.applications;
        document.getElementById("sum-total").textContent = all.length;
        document.getElementById("sum-new").textContent = all.filter(function (a) { return a.status === "new"; }).length;
        document.getElementById("sum-contacted").textContent = all.filter(function (a) { return a.status === "contacted"; }).length;
        document.getElementById("sum-enrolled").textContent = all.filter(function (a) { return a.status === "enrolled"; }).length;

        var list = filteredApplications();
        var body = document.getElementById("admin-table-body");
        body.innerHTML = "";

        if (all.length === 0) {
            var tr = document.createElement("tr");
            tr.className = "empty-row";
            var td = document.createElement("td");
            td.colSpan = 5;
            td.textContent = t("admin.emptyList");
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }
        if (list.length === 0) {
            var tr2 = document.createElement("tr");
            tr2.className = "empty-row";
            var td2 = document.createElement("td");
            td2.colSpan = 5;
            td2.textContent = t("admin.noResults");
            tr2.appendChild(td2);
            body.appendChild(tr2);
            return;
        }

        list.forEach(function (app) {
            var tr = document.createElement("tr");
            tr.addEventListener("click", function () { openDetail(app.id); });

            var tdStudent = document.createElement("td");
            tdStudent.textContent = app.studentName || t("detail.none");
            var tdParent = document.createElement("td");
            tdParent.textContent = app.parentName || t("detail.none");
            var tdProgram = document.createElement("td");
            tdProgram.textContent = programLabel(app.program);
            var tdDate = document.createElement("td");
            tdDate.className = "muted";
            tdDate.textContent = fmtDate(app.submittedAt);
            var tdStatus = document.createElement("td");
            var pill = document.createElement("span");
            pill.className = "status-pill " + (app.status || "new");
            pill.textContent = statusLabel(app.status || "new");
            tdStatus.appendChild(pill);

            tr.appendChild(tdStudent);
            tr.appendChild(tdParent);
            tr.appendChild(tdProgram);
            tr.appendChild(tdDate);
            tr.appendChild(tdStatus);
            body.appendChild(tr);
        });
    }

    adminSearchInput.addEventListener("input", renderAdminDashboard);
    adminFilterSelect.addEventListener("change", renderAdminDashboard);

    /* ---------- detail modal ---------- */
    function closeDetail() {
        detailOverlay.hidden = true;
        detailCard.innerHTML = "";
        deletePending = null;
    }
    detailOverlay.addEventListener("click", function (e) {
        if (e.target === detailOverlay) closeDetail();
    });

    function detailRow(label, value) {
        var wrap = document.createElement("div");
        wrap.className = "row";
        var k = document.createElement("div");
        k.className = "k";
        k.textContent = label;
        var v = document.createElement("div");
        v.className = "v";
        v.textContent = value || t("detail.none");
        wrap.appendChild(k);
        wrap.appendChild(v);
        return wrap;
    }

    function openDetail(id) {
        var app = state.applications.find(function (a) { return a.id === id; });
        if (!app) return;
        deletePending = null;
        detailCard.innerHTML = "";

        var head = document.createElement("div");
        head.className = "detail-head";
        var h3 = document.createElement("h3");
        h3.textContent = app.studentName || t("detail.title");
        var closeBtn = document.createElement("button");
        closeBtn.className = "icon-btn";
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", t("detail.close"));
        closeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
        closeBtn.addEventListener("click", closeDetail);
        head.appendChild(h3);
        head.appendChild(closeBtn);
        detailCard.appendChild(head);

        var meta = document.createElement("div");
        meta.className = "detail-meta";
        meta.textContent = t("detail.submitted") + ": " + fmtDate(app.submittedAt) + "  ·  " + t("detail.source") + ": " + (app.source === "manual" ? t("detail.sourceManual") : t("detail.sourcePublic"));
        detailCard.appendChild(meta);

        var rows = document.createElement("div");
        rows.className = "detail-rows";
        rows.appendChild(detailRow(t("detail.age"), app.age));
        rows.appendChild(detailRow(t("detail.grade"), app.grade));
        rows.appendChild(detailRow(t("detail.parent"), app.parentName));
        rows.appendChild(detailRow(t("detail.phone"), app.phone));
        rows.appendChild(detailRow(t("detail.email"), app.email));
        rows.appendChild(detailRow(t("detail.program"), programLabel(app.program)));
        rows.appendChild(detailRow(t("detail.format"), app.format === "online" ? t("apply.optOnline") : t("apply.optInPerson")));
        rows.appendChild(detailRow(t("detail.branch"), app.branch));
        rows.appendChild(detailRow(t("detail.experience"), app.experience));
        rows.appendChild(detailRow(t("detail.heard"), app.heard));
        var goalsRow = detailRow(t("detail.goals"), app.goals);
        goalsRow.classList.add("full");
        rows.appendChild(goalsRow);
        detailCard.appendChild(rows);

        var actions = document.createElement("div");
        actions.className = "detail-actions";

        var statusSelect = document.createElement("select");
        ["new", "contacted", "enrolled", "declined"].forEach(function (s) {
            var opt = document.createElement("option");
            opt.value = s;
            opt.textContent = statusLabel(s);
            if ((app.status || "new") === s) opt.selected = true;
            statusSelect.appendChild(opt);
        });
        actions.appendChild(statusSelect);

        var notesWrap = document.createElement("div");
        notesWrap.className = "detail-notes";
        notesWrap.style.width = "100%";
        var notesLabel = document.createElement("label");
        notesLabel.textContent = t("detail.internalNotes");
        notesLabel.style.fontSize = "0.84rem";
        notesLabel.style.fontWeight = "700";
        var notesArea = document.createElement("textarea");
        notesArea.value = app.notes || "";
        notesWrap.appendChild(notesLabel);
        notesWrap.appendChild(notesArea);

        var saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "btn btn-jade";
        saveBtn.textContent = t("detail.save");
        saveBtn.addEventListener("click", async function () {
            saveBtn.disabled = true;
            var result = await updateApplicationDoc(app.id, { status: statusSelect.value, notes: notesArea.value });
            saveBtn.disabled = false;
            if (result.ok) {
                toast(t("admin.savedToast"));
                renderAdminDashboard();
                closeDetail();
            } else {
                toast(t("admin.savingFailedToast"));
            }
        });

        var deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn btn-secondary";
        deleteBtn.textContent = t("detail.delete");
        deleteBtn.addEventListener("click", async function () {
            if (deletePending !== app.id) {
                deletePending = app.id;
                deleteBtn.textContent = t("admin.confirmDelete");
                return;
            }
            deleteBtn.disabled = true;
            var result = await deleteApplicationDoc(app.id);
            deleteBtn.disabled = false;
            if (result.ok) {
                toast(t("admin.deletedToast"));
                renderAdminDashboard();
                closeDetail();
            } else {
                toast(t("admin.savingFailedToast"));
            }
        });

        actions.appendChild(saveBtn);
        actions.appendChild(deleteBtn);
        detailCard.appendChild(notesWrap);
        detailCard.appendChild(actions);

        detailOverlay.hidden = false;
    }

    /* ---------- manual add (staff logging a phone/email application) ---------- */
    var manualAddForm = document.getElementById("manual-add-form");
    manualAddForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var fd = new FormData(manualAddForm);
        var studentName = (fd.get("studentName") || "").toString().trim();
        if (!studentName) { manualAddForm.querySelector('[name="studentName"]').focus(); return; }
        var app = {
            studentName: studentName,
            age: (fd.get("age") || "").toString().trim(),
            grade: "",
            parentName: (fd.get("parentName") || "").toString().trim(),
            phone: (fd.get("phone") || "").toString().trim(),
            email: (fd.get("email") || "").toString().trim(),
            program: (fd.get("program") || "").toString(),
            format: "",
            branch: "",
            experience: "",
            heard: "",
            goals: (fd.get("goals") || "").toString().trim(),
            status: "new",
            notes: "",
            source: "manual",
            submittedAt: new Date().toISOString(),
        };
        var result = await addApplicationDoc(app);
        if (result.ok) {
            toast(t("admin.addedToast"));
            manualAddForm.reset();
            document.getElementById("manual-add").open = false;
            renderAdminDashboard();
        } else {
            toast(t("admin.savingFailedToast"));
        }
    });

})();