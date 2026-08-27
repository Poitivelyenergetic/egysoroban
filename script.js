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
            "nav.about": "About", "nav.programs": "Programs", "nav.tryit": "Try it", "nav.journey": "How it works",
            "nav.stories": "Stories", "nav.faq": "FAQ", "nav.contact": "Contact", "nav.apply": "Apply now",
            "hero.eyebrow": "Soroban mental-math academy · Al-Mansoura, Egypt",
            "hero.titleA": "Give your child a", "hero.titleAccent": "calculator in their mind",
            "hero.sub": "Egysoroban trains children ages 4–12 to add, subtract, multiply and divide by visualizing an abacus — building focus, memory and confidence one bead at a time.",
            "hero.abacusCaption": "Focus. Memory. Speed.",
            "hero.ctaApply": "Apply now", "hero.ctaPrograms": "See programs", "hero.ctaTryIt": "Play with the beads",
            "hero.meta1": "Age range", "hero.meta2": "Levels to master", "hero.meta3": "Years of experience",
            "about.eyebrow": "About the academy",
            "about.title": "18 years turning children into abacus champions",
            "about.p1": "EGY Soroban Academy was founded by Dr. Rania Suleiman, who holds a PhD in Child Education and a Master's in Curricula and Teaching Methods for the abacus. Its program was the first of its kind accredited and taught at Mansoura University, in 2013.",
            "about.p2": "EGY Soroban is Egypt's official member and representative in AIAMA, the international abacus association based in Singapore and Taiwan — training children ages 4 to 12 through 11 structured levels, from first counting beads to full mental calculation (Anzan).",
            "about.stat1": "First-place championship wins", "about.stat2": "Years of experience",
            "about.stat3": "Structured training levels", "about.stat4": "World championship titles",
            "why.eyebrow": "Why soroban", "why.title": "What changes when a child trains this way",
            "why.lede": "Soroban training is a physical, visual and mental exercise at once — that combination is what shows up in the classroom, not just on a math test.",
            "why.c1t": "Sharper focus", "why.c1p": "Tracking beads across ten columns trains sustained attention — children carry that focus into homework and exams.",
            "why.c2t": "Stronger working memory", "why.c2p": "Visualizing the abacus (Anzan) exercises the same memory muscles used for reading comprehension and multi-step problems.",
            "why.c3t": "Real calculation speed", "why.c3p": "Regular training builds the speed and accuracy tested at national and international soroban championships.",
            "why.c4t": "Visible confidence", "why.c4p": "Certified exams at each of the 11 levels give children concrete, official proof that their mental abilities are growing.",
            "programs.eyebrow": "Programs", "programs.title": "Eleven levels, one path",
            "programs.lede": "Every student is placed by assessment, then moves level by level through 11 KYU grades — each closed out with a certified AIAMA exam before advancing.",
            "programs.l1age": "Ages 4–12 · 10th–8th KYU", "programs.l1title": "Beginner", "programs.l1desc": "First contact with the abacus: counting, number sense, and single-digit addition and subtraction.",
            "programs.l2age": "Ages 4–12 · 7th–4th KYU", "programs.l2title": "Intermediate", "programs.l2desc": "Multi-digit addition and subtraction, and the shift toward Anzan — calculating without touching the beads.",
            "programs.l3age": "Ages 4–12 · 3rd–1st KYU", "programs.l3title": "Expert", "programs.l3desc": "Multiplication, division, and full mental (Anzan) calculation — the level competition-track students train at.",
            "programs.duration": "4–8 months per level",
            "programs.format1": "1 session / week",
            "tryit.eyebrow": "Practice", "tryit.title": "Try mental math yourself",
            "tryit.lede": "Two quick demos of what soroban and Anzan training feel like — no sign-up needed.",
            "tryit.abacusTitle": "Interactive abacus", "tryit.abacusLede": "Tap the beads to form numbers, just like our students do.",
            "tryit.valueLabel": "Value:",
            "tryit.flashTitle": "Flash challenge", "tryit.flashLede": "Three numbers will flash quickly — add them in your head!",
            "tryit.flashQuestion": "What's the sum?", "tryit.flashCheck": "Check",
            "tryit.flashStart": "Start challenge", "tryit.flashStartAgain": "Try again",
            "tryit.flashCorrect": "🎉 Correct! Well done.",
            "tryit.flashWrong": "The correct sum was {sum} — try again!",
            "tryit.flashCta": "Want your child calculating this fast? Apply now →",
            "tryit.beadHeaven": "Five-bead — column {col}", "tryit.beadEarth": "One-bead {n} — column {col}",
            "journey.eyebrow": "How it works", "journey.title": "From application to first level exam",
            "journey.s1t": "Apply online", "journey.s1p": "Send your child's details through the form below — takes about two minutes.",
            "journey.s2t": "Assessment", "journey.s2p": "Our team contacts you to arrange a placement assessment at the academy.",
            "journey.s3t": "Placed in a level", "journey.s3p": "Your child is placed at their KYU level based on age and starting point.",
            "journey.s4t": "Weekly class & practice", "journey.s4p": "One weekly 2-hour session, moving through 11 levels from Beginner to Expert.",
            "journey.s5t": "Certified exam", "journey.s5p": "An AIAMA-certified exam closes each level before moving to the next.",
            "instructors.eyebrow": "Leadership & team", "instructors.title": "Founded by an academic, run by a team",
            "instructors.lede": "EGY Soroban's program is accredited and led by certified trainers under AIAMA international standards.",
            "instructors.name1": "Dr. Rania Suleiman", "instructors.role1": "Founder & Academic Director", "instructors.bio1": "PhD in Child Education, Master's in Curricula and Teaching Methods for the abacus. Built the program first accredited and taught at Mansoura University in 2013.",
            "instructors.name2": "Training Team", "instructors.role2": "Certified Instructors", "instructors.bio2": "Deliver all 11 levels under AIAMA-certified exam standards, from first beads to full mental (Anzan) calculation.",
            "instructors.name3": "Competition Team", "instructors.role3": "Championship Coaching Staff", "instructors.bio3": "Prepares students who represent Egypt in AIAMA and Arab Soroban Federation championships.",
            "testimonials.eyebrow": "Achievements", "testimonials.title": "Real results, not just promises",
            "testimonials.q1": "100+ first-place wins in local and international soroban championships, including 4 world titles.",
            "testimonials.a1": "Championship record",
            "testimonials.q2": "Named “Champion of Arab Champions” at the 2025 Arab Mental Arithmetic Championship, with 11 championship placements for Team Egypt.",
            "testimonials.a2": "Arab Soroban Federation, 2025",
            "testimonials.q3": "Academy champions honored by Egypt's Minister of Youth & Sports, Dr. Ashraf Sobhy, for their achievements.",
            "testimonials.a3": "National recognition",
            "faq.eyebrow": "Questions", "faq.title": "Frequently asked",
            "faq.q1": "What age can my child start?", "faq.a1": "We accept children from age 4 to 12. Before starting, a child should already know the numbers 1–10 in English (reading, meaning, and writing).",
            "faq.q2": "Do you offer online classes?", "faq.a2": "Currently all classes run in person at our academy in Al-Mansoura, Egypt.",
            "faq.q3": "How long until I see results?", "faq.a3": "Each of the 11 levels takes roughly 4 to 8 months, with one 2-hour class per week — most parents notice a change in focus and speed within the first couple of levels.",
            "faq.q4": "Are there exams and certificates?", "faq.a4": "Yes — each level closes with an exam certified by AIAMA, the international abacus association, before advancing to the next.",
            "faq.q5": "Does the academy compete internationally?", "faq.a5": "Yes — EGY Soroban officially represents Egypt in AIAMA (Singapore–Taiwan) and has won 100+ first-place titles, including 4 world championships.",
            "apply.eyebrow": "Apply to join", "apply.title": "Apply to EGY Soroban Academy",
            "apply.lede": "Tell us about your child below and our team will contact you to arrange an assessment and placement.",
            "apply.b1": "Takes about two minutes to fill in", "apply.b2": "Our team will contact you to schedule an assessment", "apply.b3": "No payment needed to apply",
            "apply.fStudentName": "Student's full name", "apply.fAge": "Student's age", "apply.fGrade": "Grade / school year",
            "apply.optional": "(optional)", "apply.fParentName": "Parent / guardian name", "apply.fPhone": "Phone number", "apply.fEmail": "Email address",
            "apply.errRequired": "This field is required.", "apply.errEmail": "Enter a valid email address.",
            "apply.fProgram": "Preferred program", "apply.optNotSure": "Not sure — need assessment",
            "apply.fExperience": "Prior soroban / math experience", "apply.optExpNone": "None", "apply.optExpSome": "Some, self-taught", "apply.optExpSwitch": "Switching from another academy",
            "apply.fHeard": "How did you hear about us?", "apply.optSelect": "Select one", "apply.optSocial": "Social media",
            "apply.optFriend": "Friend or family", "apply.optSearch": "Online search", "apply.optSchool": "School", "apply.optOther": "Other",
            "apply.fGoals": "Goals or notes for us", "apply.submit": "Submit application", "apply.submitting": "Sending…",
            "apply.privacyNote": "Your details are only used to contact you about joining Egysoroban.",
            "apply.successOnline": "Thank you! Your application has been received and saved — we'll contact you soon.",
            "apply.fallbackTitle": "Almost there — one more click",
            "apply.fallbackMsg": "This page can't save applications automatically right now, so send yours by email instead — your details are already filled in.",
            "apply.fallbackBtn": "Send application by email",
            "contact.eyebrow": "Get in touch", "contact.title": "Questions before you apply?",
            "contact.phoneLabel": "Phone / WhatsApp", "contact.emailLabel": "Email", "contact.whatsappLabel": "WhatsApp",
            "contact.branchesLabel": "Location", "contact.branchesValue": "Al-Mansoura, Egypt",
            "contact.hoursLabel": "Follow us", "contact.hoursValue": "Instagram & Facebook: @sorobanegy",
            "contact.mapNote": "Al-Mansoura, Egypt — map preview placeholder",
            "footer.blurb": "Egypt's official AIAMA-member soroban academy — training children ages 4–12 in mental arithmetic since 2013.",
            "footer.explore": "Explore", "footer.contact": "Contact", "footer.copy": "© 2026 Egysoroban — EGY Soroban Academy, Al-Mansoura, Egypt",
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
            "detail.experience": "Prior experience",
            "detail.heard": "Heard about us via", "detail.goals": "Goals / notes from parent", "detail.submitted": "Submitted",
            "detail.source": "Source", "detail.sourcePublic": "Public application form", "detail.sourceManual": "Logged manually by staff",
            "detail.status": "Status", "detail.internalNotes": "Internal notes (staff only)", "detail.save": "Save changes",
            "detail.delete": "Delete application", "detail.close": "Close", "detail.none": "—",
        },
        ar: {
            "a11y.skip": "تخطَّ إلى المحتوى",
            "nav.about": "عن الأكاديمية", "nav.programs": "البرامج", "nav.tryit": "جرّب بنفسك", "nav.journey": "كيف نعمل",
            "nav.stories": "آراء أولياء الأمور", "nav.faq": "الأسئلة الشائعة", "nav.contact": "تواصل معنا", "nav.apply": "قدّم الآن",
            "hero.eyebrow": "أكاديمية السوروبان للحساب الذهني · المنصورة، مصر",
            "hero.titleA": "امنح طفلك", "hero.titleAccent": "آلة حاسبة داخل عقله",
            "hero.sub": "تُدرّب إيجي سوروبان الأطفال من سن 4 إلى 12 عامًا على الجمع والطرح والضرب والقسمة من خلال تخيّل العداد — لبناء التركيز والذاكرة والثقة، خرزة تلو الأخرى.",
            "hero.abacusCaption": "تركيز. ذاكرة. سرعة.",
            "hero.ctaApply": "قدّم الآن", "hero.ctaPrograms": "استعرض البرامج", "hero.ctaTryIt": "جرّب الخرزات",
            "hero.meta1": "الفئة العمرية", "hero.meta2": "مستويات للإتقان", "hero.meta3": "سنوات من الخبرة",
            "about.eyebrow": "عن الأكاديمية",
            "about.title": "18 عامًا من صناعة أبطال السوروبان",
            "about.p1": "تأسست أكاديمية إيجي سوروبان على يد الدكتورة رانيا سليمان، الحاصلة على دكتوراه في تربية الطفل وماجستير في المناهج وطرق تدريس العداد. كان برنامجها أول برنامج يُعتمد ويُدرَّس في جامعة المنصورة عام 2013.",
            "about.p2": "إيجي سوروبان عضو رسمي وممثل مصر في الاتحاد الدولي للعداد AIAMA (سنغافورة – تايوان) — يدرّب الأطفال من سن 4 إلى 12 عامًا عبر 11 مستوى منظّمًا، من عدّ الخرز الأول وحتى الحساب الذهني الكامل (أنزان).",
            "about.stat1": "مركز أول في البطولات", "about.stat2": "سنوات من الخبرة",
            "about.stat3": "مستوى تدريبي منظم", "about.stat4": "لقب بطولة عالمية",
            "why.eyebrow": "لماذا السوروبان", "why.title": "ماذا يتغيّر عندما يتدرّب الطفل بهذه الطريقة",
            "why.lede": "تدريب السوروبان تمرين جسدي وبصري وذهني في آنٍ واحد — وهذا المزيج هو ما ينعكس داخل الفصل الدراسي، لا في اختبار الرياضيات فقط.",
            "why.c1t": "تركيز أعلى", "why.c1p": "متابعة الخرز عبر عشرة أعمدة تُدرّب الانتباه المستمر — ويحمل الطفل هذا التركيز معه إلى الواجبات والامتحانات.",
            "why.c2t": "ذاكرة عاملة أقوى", "why.c2p": "تخيّل العداد (أنزان) يُشغّل نفس عضلات الذاكرة المستخدمة في فهم المقروء وحل المسائل متعددة الخطوات.",
            "why.c3t": "سرعة حساب حقيقية", "why.c3p": "التدريب المنتظم يبني السرعة والدقة اللتين تُختبران في البطولات المحلية والدولية للسوروبان.",
            "why.c4t": "ثقة ملموسة", "why.c4p": "تمنح الاختبارات المعتمدة في كل من المستويات الـ11 الطفل دليلًا رسميًا وملموسًا على أن قدراته الذهنية تنمو.",
            "programs.eyebrow": "البرامج", "programs.title": "أحد عشر مستوى، مسار واحد",
            "programs.lede": "يُوضع كل طالب في مستواه بعد تقييم، ثم يتقدّم عبر 11 درجة (KYU) — يُختتم كل مستوى باختبار معتمد من AIAMA قبل الانتقال للتالي.",
            "programs.l1age": "من 4 إلى 12 سنة · KYU 10–8", "programs.l1title": "مبتدئ", "programs.l1desc": "أول تعامل مع العداد: العدّ، الحس العددي، والجمع والطرح بخانة واحدة.",
            "programs.l2age": "من 4 إلى 12 سنة · KYU 7–4", "programs.l2title": "متوسط", "programs.l2desc": "إتقان الجمع والطرح متعدد الخانات، والانتقال نحو «أنزان» — الحساب دون لمس الخرز.",
            "programs.l3age": "من 4 إلى 12 سنة · KYU 3–1", "programs.l3title": "خبراء", "programs.l3desc": "الضرب والقسمة، والحساب الذهني الكامل («أنزان») — مستوى طلاب مسار المسابقات.",
            "programs.duration": "من 4 إلى 8 أشهر لكل مستوى",
            "programs.format1": "حصة واحدة أسبوعيًا",
            "tryit.eyebrow": "تدرّب", "tryit.title": "جرّب الحساب الذهني بنفسك",
            "tryit.lede": "نموذجان سريعان لما يشعر به تدريب السوروبان وأنزان — بلا حاجة للتسجيل.",
            "tryit.abacusTitle": "العداد التفاعلي", "tryit.abacusLede": "اضغطي على الخرزات لتكوين الأرقام كما يفعل طلابنا.",
            "tryit.valueLabel": "القيمة:",
            "tryit.flashTitle": "تحدي الومضة", "tryit.flashLede": "ستظهر ثلاثة أرقام سريعًا — اجمعيها في ذهنكِ!",
            "tryit.flashQuestion": "ما مجموع الأرقام؟", "tryit.flashCheck": "تحقّق",
            "tryit.flashStart": "ابدأ التحدي", "tryit.flashStartAgain": "جرّب مرة أخرى",
            "tryit.flashCorrect": "🎉 إجابة صحيحة! أحسنتِ.",
            "tryit.flashWrong": "المجموع الصحيح هو {sum} — حاولي مرة أخرى!",
            "tryit.flashCta": "هل يستطيع طفلكِ أن يحسبها بهذه السرعة؟ قدّمي الآن ←",
            "tryit.beadHeaven": "خرزة الخمسات — عمود {col}", "tryit.beadEarth": "خرزة الآحاد {n} — عمود {col}",
            "journey.eyebrow": "كيف نعمل", "journey.title": "من التقديم إلى اختبار المستوى الأول",
            "journey.s1t": "قدّم عبر الموقع", "journey.s1p": "أرسلي بيانات طفلك عبر النموذج أدناه — يستغرق ذلك نحو دقيقتين.",
            "journey.s2t": "تقييم لتحديد المستوى", "journey.s2p": "يتواصل معكِ فريقنا لتحديد موعد تقييم المستوى بالأكاديمية.",
            "journey.s3t": "التحاق بمستوى مناسب", "journey.s3p": "يُوضع طفلك في درجة KYU المناسبة وفق عمره ونقطة انطلاقه.",
            "journey.s4t": "حصة أسبوعية وتمرين", "journey.s4p": "حصة واحدة أسبوعيًا مدتها ساعتان، عبر 11 مستوى من مبتدئ إلى خبراء.",
            "journey.s5t": "اختبار معتمد", "journey.s5p": "اختبار معتمد من AIAMA يُختتم به كل مستوى قبل الانتقال إلى التالي.",
            "instructors.eyebrow": "القيادة والفريق", "instructors.title": "أسستها أكاديمية، ويقودها فريق",
            "instructors.lede": "برنامج إيجي سوروبان معتمد ويقوده مدربون معتمدون وفق معايير الاتحاد الدولي AIAMA.",
            "instructors.name1": "د. رانيا سليمان", "instructors.role1": "المؤسسة والمديرة الأكاديمية", "instructors.bio1": "حاصلة على دكتوراه في تربية الطفل، وماجستير في المناهج وطرق تدريس العداد. أسّست البرنامج الذي كان أول برنامج يُعتمد ويُدرَّس في جامعة المنصورة عام 2013.",
            "instructors.name2": "فريق التدريب", "instructors.role2": "مدربون معتمدون", "instructors.bio2": "يقدّمون المستويات الـ11 كافة وفق معايير الاختبارات المعتمدة من AIAMA، من أول خرزة إلى الحساب الذهني الكامل (أنزان).",
            "instructors.name3": "فريق المسابقات", "instructors.role3": "طاقم تدريب البطولات", "instructors.bio3": "يُعِدّ الطلاب الذين يمثّلون مصر في بطولات AIAMA والاتحاد العربي للسوروبان.",
            "testimonials.eyebrow": "الإنجازات", "testimonials.title": "نتائج حقيقية، لا وعود فقط",
            "testimonials.q1": "أكثر من 100 مركز أول في البطولات المحلية والدولية للسوروبان، من بينها 4 ألقاب عالمية.",
            "testimonials.a1": "السجل البطولي",
            "testimonials.q2": "لقب «بطل أبطال العرب» في بطولة الحساب الذهني العربية لعام 2025، مع 11 مركز بطولة لمنتخب مصر.",
            "testimonials.a2": "الاتحاد العربي للسوروبان، 2025",
            "testimonials.q3": "تكريم أبطال الأكاديمية من قِبل وزير الشباب والرياضة د. أشرف صبحي تقديرًا لإنجازاتهم.",
            "testimonials.a3": "تكريم رسمي",
            "faq.eyebrow": "أسئلتكم", "faq.title": "الأسئلة الأكثر شيوعًا",
            "faq.q1": "في أي سنّ يمكن لطفلي أن يبدأ؟", "faq.a1": "نستقبل الأطفال من سن 4 إلى 12 عامًا. قبل البدء، يجب أن يتقن الطفل الأرقام من 1 إلى 10 باللغة الإنجليزية (قراءة وفهمًا وكتابة).",
            "faq.q2": "هل تقدّمون حصصًا عبر الإنترنت؟", "faq.a2": "حاليًا، تُقام جميع الحصص حضوريًا في أكاديميتنا بالمنصورة، مصر.",
            "faq.q3": "متى تظهر النتائج؟", "faq.a3": "يستغرق كل مستوى من الـ11 مستوى نحو 4 إلى 8 أشهر، بحصة أسبوعية مدتها ساعتان — ويلاحظ معظم أولياء الأمور تحسّنًا خلال أول مستويين.",
            "faq.q4": "هل توجد اختبارات وشهادات؟", "faq.a4": "نعم — يُختتم كل مستوى باختبار معتمد من AIAMA، الاتحاد الدولي للعداد، قبل الانتقال إلى التالي.",
            "faq.q5": "هل تشارك الأكاديمية دوليًا؟", "faq.a5": "نعم — إيجي سوروبان ممثل رسمي لمصر في AIAMA (سنغافورة – تايوان)، وحقق أكثر من 100 مركز أول من بينها 4 ألقاب عالمية.",
            "apply.eyebrow": "التقديم للالتحاق", "apply.title": "قدّمي لأكاديمية إيجي سوروبان",
            "apply.lede": "أخبرينا عن طفلك في النموذج أدناه، وسيتواصل معكِ فريقنا لتحديد موعد التقييم والالتحاق.",
            "apply.b1": "يستغرق التعبئة نحو دقيقتين", "apply.b2": "سيتواصل فريقنا معكِ لتحديد موعد تقييم", "apply.b3": "لا حاجة لأي دفع للتقديم",
            "apply.fStudentName": "اسم الطالب كاملًا", "apply.fAge": "عمر الطالب", "apply.fGrade": "الصف / المرحلة الدراسية",
            "apply.optional": "(اختياري)", "apply.fParentName": "اسم ولي/ة الأمر", "apply.fPhone": "رقم الهاتف", "apply.fEmail": "البريد الإلكتروني",
            "apply.errRequired": "هذا الحقل مطلوب.", "apply.errEmail": "أدخلي بريدًا إلكترونيًا صحيحًا.",
            "apply.fProgram": "البرنامج المفضّل", "apply.optNotSure": "غير محدد — بحاجة إلى تقييم",
            "apply.fExperience": "خبرة سابقة بالسوروبان أو الحساب", "apply.optExpNone": "لا توجد", "apply.optExpSome": "بعض الخبرة الذاتية", "apply.optExpSwitch": "انتقال من أكاديمية أخرى",
            "apply.fHeard": "كيف سمعتِ عنّا؟", "apply.optSelect": "اختاري", "apply.optSocial": "مواقع التواصل الاجتماعي",
            "apply.optFriend": "صديق أو أحد الأقارب", "apply.optSearch": "بحث عبر الإنترنت", "apply.optSchool": "المدرسة", "apply.optOther": "أخرى",
            "apply.fGoals": "أهداف أو ملاحظات لنا", "apply.submit": "إرسال الطلب", "apply.submitting": "جارٍ الإرسال…",
            "apply.privacyNote": "تُستخدم بياناتكِ فقط للتواصل معكِ بخصوص الالتحاق بإيجي سوروبان.",
            "apply.successOnline": "شكرًا لكِ! وصل طلبكِ وتم حفظه — سنتواصل معكِ قريبًا.",
            "apply.fallbackTitle": "خطوة أخيرة",
            "apply.fallbackMsg": "لا يمكن لهذه الصفحة حفظ الطلبات تلقائيًا الآن، لذا أرسلي طلبكِ عبر البريد الإلكتروني بدلًا من ذلك — بياناتكِ معبّأة بالفعل.",
            "apply.fallbackBtn": "إرسال الطلب عبر البريد الإلكتروني",
            "contact.eyebrow": "تواصلي معنا", "contact.title": "أسئلة قبل التقديم؟",
            "contact.phoneLabel": "الهاتف / واتساب", "contact.emailLabel": "البريد الإلكتروني", "contact.whatsappLabel": "واتساب",
            "contact.branchesLabel": "الموقع", "contact.branchesValue": "المنصورة، مصر",
            "contact.hoursLabel": "تابعينا", "contact.hoursValue": "إنستغرام وفيسبوك: sorobanegy@",
            "contact.mapNote": "المنصورة، مصر — نموذج توضيحي لموقع الخريطة",
            "footer.blurb": "أكاديمية السوروبان العضو الرسمي في AIAMA لمصر — تدرّب الأطفال من سن 4 إلى 12 عامًا في الحساب الذهني منذ عام 2013.",
            "footer.explore": "استكشفي", "footer.contact": "تواصلي", "footer.copy": "© 2026 إيجي سوروبان — أكاديمية EGY Soroban، المنصورة، مصر",
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
            "detail.experience": "الخبرة السابقة",
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
    var ADMIN_EMAIL = "info@egysoroban.com";

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
       TRY IT — interactive abacus + flash challenge
       Each rod: 1 heaven bead (value 5) + 4 earth beads (value 1 each).
       ============================================================ */
    function initSoroban() {
        var root = document.getElementById("try-soroban");
        var valueEl = document.getElementById("soroban-value-num");
        if (!root || !valueEl) return;

        var rodCount = parseInt(root.getAttribute("data-rods"), 10) || 3;
        var rods = [];

        function makeBead(label, onClick) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "try-bead";
            b.setAttribute("aria-label", label);
            b.addEventListener("click", onClick);
            return b;
        }

        function render() {
            var total = 0;
            rods.forEach(function (rod, i) {
                var digit = (rod.heaven ? 5 : 0) + rod.earth;
                total += digit * Math.pow(10, rods.length - 1 - i);
                rod.heavenBtn.classList.toggle("active", rod.heaven);
                rod.heavenBtn.setAttribute("aria-pressed", String(rod.heaven));
                rod.earthBtns.forEach(function (b, j) {
                    var active = j < rod.earth;
                    b.classList.toggle("active", active);
                    b.setAttribute("aria-pressed", String(active));
                });
            });
            valueEl.textContent = total.toLocaleString(state.lang === "ar" ? "ar-EG" : "en-US");
        }

        function buildRod(index) {
            var rod = { heaven: false, earth: 0, heavenBtn: null, earthBtns: [] };

            var col = document.createElement("div");
            col.className = "soroban-rod";

            var heavenArea = document.createElement("div");
            heavenArea.className = "soroban-heaven";
            rod.heavenBtn = makeBead(t("tryit.beadHeaven").replace("{col}", index + 1), function () {
                rod.heaven = !rod.heaven;
                render();
            });
            heavenArea.appendChild(rod.heavenBtn);

            var bar = document.createElement("div");
            bar.className = "soroban-bar";

            var earthArea = document.createElement("div");
            earthArea.className = "soroban-earth";
            for (var j = 0; j < 4; j++) {
                (function (idx) {
                    var b = makeBead(t("tryit.beadEarth").replace("{n}", idx + 1).replace("{col}", index + 1), function () {
                        rod.earth = (rod.earth >= idx + 1) ? idx : idx + 1;
                        render();
                    });
                    rod.earthBtns.push(b);
                    earthArea.appendChild(b);
                })(j);
            }

            col.appendChild(heavenArea);
            col.appendChild(bar);
            col.appendChild(earthArea);
            root.appendChild(col);
            return rod;
        }

        for (var r = 0; r < rodCount; r++) {
            rods.push(buildRod(r));
        }
        render();
    }

    function initFlashGame() {
        var root = document.querySelector(".flash-game");
        if (!root) return;

        var display = root.querySelector(".flash-display");
        var form = root.querySelector(".flash-form");
        var input = root.querySelector("#flash-answer");
        var result = root.querySelector(".flash-result");
        var startBtn = root.querySelector(".flash-start");
        var cta = root.querySelector(".flash-cta");

        var FLASH_MS = 800;
        var GAP_MS = 250;
        var COUNT = 3;
        var sum = 0;
        var running = false;

        function fmtNum(n) {
            return n.toLocaleString(state.lang === "ar" ? "ar-EG" : "en-US");
        }

        function randomNumber() {
            return Math.floor(Math.random() * 20) + 1;
        }

        function flashNumber(i) {
            if (i >= COUNT) {
                display.textContent = "?";
                form.hidden = false;
                input.value = "";
                input.focus();
                running = false;
                startBtn.disabled = false;
                startBtn.textContent = t("tryit.flashStartAgain");
                return;
            }
            var n = randomNumber();
            sum += n;
            display.textContent = fmtNum(n);
            setTimeout(function () {
                display.textContent = "";
                setTimeout(function () { flashNumber(i + 1); }, GAP_MS);
            }, FLASH_MS);
        }

        function startRound() {
            if (running) return;
            running = true;
            sum = 0;
            result.textContent = "";
            result.className = "flash-result";
            form.hidden = true;
            cta.hidden = true;
            startBtn.disabled = true;
            flashNumber(0);
        }

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var answer = parseInt(input.value, 10);
            if (isNaN(answer)) return;

            if (answer === sum) {
                result.textContent = t("tryit.flashCorrect");
                result.className = "flash-result ok";
            } else {
                result.textContent = t("tryit.flashWrong").replace("{sum}", fmtNum(sum));
                result.className = "flash-result no";
            }
            form.hidden = true;
            cta.hidden = false;
        });

        startBtn.addEventListener("click", startRound);
    }

    initSoroban();
    initFlashGame();

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
            "Preferred level: " + (app.program || "—"),
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
        var map = { "beginner": "programs.l1title", "intermediate": "programs.l2title", "expert": "programs.l3title", "unsure": "apply.optNotSure" };
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