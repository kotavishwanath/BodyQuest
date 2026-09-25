/**
 * Anatomy asset manifest for scripts/build-models.mjs.
 *
 * Source: BodyParts3D (c) The Database Center for Life Science, licensed under
 * CC Attribution-Share Alike 2.1 Japan. STL mirror:
 * https://github.com/Kevin-Mattheus-Moerman/BodyParts3D
 *
 * Each NODE becomes one named mesh in a GLB. `name` must match `meshName`
 * (or an entry of `meshNames`) in /content/parts/*.json.
 *
 *  file   – which GLB the node is written to (lazy-loaded per view)
 *  group  – render group used by layer peeling: skin | muscles | organs | skeleton
 *  system – body system (for system views and colour coding)
 *  view   – preferred camera side for fly-to: front (default) | back | side
 *
 * Reproductive structures are intentionally NOT included (Section 15; BiPC-only
 * schematic content arrives in Phase 7).
 */

// Colour palette (Section 13): bones ivory, muscles coral, arteries red,
// veins blue, nerves yellow, organs distinct soft colours.
export const COLORS = {
  skin: "#d9a384",
  hair: "#3b2a20",
  shorts: "#3a6fd8",
  bone: "#ece3cc",
  cartilage: "#dfe7ea",
  tooth: "#f7f3e8",
  muscle: "#c9574b",
  muscleOther: "#b8544a",
  tendon: "#e8dcc0",
  artery: "#c62828",
  vein: "#2458c2",
  heart: "#b3263a",
  lungs: "#e59a9a",
  airway: "#e8c6b8",
  liver: "#8c3b2e",
  stomach: "#e0a06a",
  intestines: "#dfa487",
  pancreas: "#e6bf78",
  spleen: "#7d3a52",
  kidney: "#94403c",
  bladder: "#e3b58c",
  brain: "#e6b3b8",
  cerebellum: "#d99aa6",
  brainstem: "#e3c1a8",
  colon: "#d99378",
  thymus: "#e8b9a6",
  eye: "#f4f1ea",
  nerve: "#f2c94c",
  gland: "#d99a7a",
  diaphragm: "#c8645a",
};

export const FILES = {
  skin: { triangleBudget: 150000 },
  skeleton: { triangleBudget: 170000 },
  muscles: { triangleBudget: 190000 },
  organs: { triangleBudget: 120000 },
  circulatory: { triangleBudget: 45000 },
};

const ids = (...list) => list.map((x) => (String(x).startsWith("BP") || String(x).startsWith("FMA") ? String(x) : `FMA${x}`));

// ── Skeleton ──────────────────────────────────────────────────────────────
const UPPER_TEETH = ids(55681, 55698, 55689, 55680, 55697, 55688, 55798, 55682, 55699, 55690, 55683, 55700, 55691, 55799);
const LOWER_TEETH = ids(57142, 55705, 55694, 57140, 55706, 55695, 55686, 57143, 55704, 55693, 57141, 55703, 55692, 55687);
const SKULL = ids(52734, 52735, 52736, 52738, 52739, 52740, 52788, 52789, 53649, 53650, 52892, 52893, 53647, 53648, 53645, 53646, 53655, 53656, 9710, 54737, 54738);
const MANDIBLE = ids(52748);
const CERVICAL = ids(12519, 12520, 12521, 12522, 12523, 12524, 12525);
const THORACIC = ids(9165, 9187, 9209, 9248, 9922, 9945, 9968, 9991, 10014, 10037, 10059, 10081);
const LUMBAR = ids(13072, 13073, 13074, 13075, 13076);
const DISCS = ids(25058, 13896, 13897, 13898, 13899, 13900, 10458, 13495, 13500, 13501, 13502, 13503, 13504, 13505, 13506, 13507, 13508, 13509, 16033, 16034, 16035, 16036, 16037);
const RIBS = ids(7857, 7882, 7909, 7957, 8066, 8175, 8229, 8283, 8364, 8445, 8531, 8533, 7987, 8012, 8039, 8148, 8093, 8202, 8256, 8310, 8391, 8472, 8532, 8534);
const COSTAL_CARTILAGE = ids("BP24", "BP28", 8005, 8031, 8058, 8167, 8112, 8221, 8275, 7875, 7886, 7913, 7976, 8070, 8194, 8248);
const STERNUM = ids(7486, 7487, 7488);
const CLAVICLES = ids(13322, 13323);
const SCAPULAE = ids(13395, 13396);
const HUMERI = ids(23130, 23131);
const RADII = ids(23464, 23465);
const ULNAE = ids(23467, 23468);
const HAND_BONES = ids(
  24435, 24437, 24439, 24441, 24443, 23725, 24446, 24448, 24436, 24438, 24440, 24442, 24444, 24445, 24447, 24449,
  24464, 24466, 24468, 24470, 24472, 24465, 24467, 24469, 24471, 24473,
  24450, 24451, 24452, 24453, 24454, 65470, 71915, 71908, 71916, 66791,
  24455, 24456, 24457, 24458, 23938, 23940, 23942, 23944,
  24459, 24460, 24461, 24462, 24463, 23951, 23953, 23955, 23957, 23959,
);
const PELVIS = ids(16586, 16587, 16202);
const FEMURS = ids(24474, 24475);
const PATELLAE = ids(24486, 24487);
const TIBIAE = ids(24477, 24478);
const FIBULAE = ids(24480, 24481);
const FOOT_BONES = ids(
  24482, 24497, 24500, 24528, 24521, 24523, 24525, 24507, 24509, 24511, 24513, 24515,
  43253, 32634, 32636, 32638, 32640, 32642, 32644, 32646, 230986, 32650, 32652, 32654, 32656, 32658, 45097,
  24483, 24498, 24501, 24529, 24522, 24524, 24526, 24508, 24510, 24512, 24514, 24516,
  43254, 32635, 32637, 32639, 32641, 32643, 32645, 32647, 230988, 32651, 32653, 32655, 32657, 32659, 45098,
);

const bone = (name, fma, extra = {}) => ({ name, file: "skeleton", group: "skeleton", system: "skeletal", color: COLORS.bone, fma, ...extra });

// ── Muscles ───────────────────────────────────────────────────────────────
const muscle = (name, fma, extra = {}) => ({ name, file: "muscles", group: "muscles", system: "muscular", color: COLORS.muscle, fma, ...extra });

const OTHER_MUSCLES = ids(
  // forearm
  38486, 38487, 38460, 38461, 38617, 38618, 38619, 38620, 38463, 38464, 38638, 38639, 38640, 38641,
  38495, 38496, 38498, 38499, 38501, 38502, "BP44", "BP45", "BP46", "BP47", 38504, 38505,
  38560, 38561, 38562, 38563, 37668, 37669, 38516, 38517, 38519, 38520,
  // shoulder and back
  32547, 32548, 32551, 32552, 32553, 32554, 13381, 13382, 13398, 13399, 32540, 32541, 22728, 22729,
  // neck
  13408, 13409, 13346, 13347,
  // face and scalp
  46759, 46760, 46761, 46762, 46841, 46782, 46783, 46785, 46786, 46812, 46813, 46835, 46836,
  // hip and thigh
  22330, 22331, 22425, 22426, 58776, 58777, 22456, 22457, 22459, 22460, 43883, 43884, 22450, 22451,
  // lower leg
  22544, 22545, 22552, 22553, 22554, 22555, 22548, 22549, 22546, 22547,
);

// ── Nodes ─────────────────────────────────────────────────────────────────
export const NODES = [
  // Skeleton
  bone("skull", [...SKULL, ...UPPER_TEETH]),
  bone("mandible", [...MANDIBLE, ...LOWER_TEETH]),
  bone("spine", [...CERVICAL, ...THORACIC, ...LUMBAR, ...DISCS], { view: "back" }),
  bone("ribs", [...RIBS, ...COSTAL_CARTILAGE]),
  bone("sternum", STERNUM),
  bone("clavicles", CLAVICLES),
  bone("scapulae", SCAPULAE, { view: "back" }),
  bone("humeri", HUMERI),
  bone("radii", RADII),
  bone("ulnae", ULNAE),
  bone("hand_bones", HAND_BONES),
  bone("pelvis", PELVIS),
  bone("femurs", FEMURS),
  bone("patellae", PATELLAE),
  bone("tibiae", TIBIAE),
  bone("fibulae", FIBULAE, { view: "side" }),
  bone("foot_bones", FOOT_BONES),

  // Muscles
  muscle("deltoids", ids(34680, 34681, 34682, 34683, 34684, 34685)),
  muscle("biceps", ids(37686, 37687, 37684, 37685)),
  muscle("triceps", ids(37699, 37700, 37697, 37698, 37695, 37696), { view: "back" }),
  muscle("pectorals", ids(34690, 34691, 79979, 79980, 45874, 45875)),
  muscle("rectus_abdominis", ids(13377, 13378, 11336)),
  muscle("external_obliques", ids(13336, 13337)),
  muscle("trapezius", ids(33586, 33587, 33584, 33585, 33581, 33583), { view: "back" }),
  muscle("latissimus_dorsi", ids(13358, 13359), { view: "back" }),
  muscle("gluteus_maximus", ids(22328, 22329), { view: "back" }),
  muscle("quadriceps", ids(38928, 38929, 38930, 38931, 38932, 38933, 38934, 38935)),
  muscle("hamstrings", ids(45888, 45889, 45891, 45892, 22358, 22359, 22448, 22449), { view: "back" }),
  muscle("calf_muscles", ids(45957, 45958, 45960, 45961, 22558, 22559), { view: "back" }),
  muscle("sartorius", ids(22354, 22355)),
  muscle("jaw_muscles", ids(49001, 49002, 49004, 49005, 49007, 49008), { view: "side" }),
  muscle("achilles_tendons", ids(258847, 264844), { color: COLORS.tendon, view: "back" }),
  muscle("muscles_other", OTHER_MUSCLES, { color: COLORS.muscleOther }),

  // Organs (nervous, sensory, respiratory, digestive, urinary...)
  // `alsoIn` lists extra systems whose system view shows this node.
  {
    name: "brain",
    file: "organs",
    group: "organs",
    system: "nervous",
    color: COLORS.brain,
    fma: ids(
      72653, 72654, 72655, 72656, 72661, 72662, 72665, 72666, 72667, 72668, 72669, 72670, "BP49", "BP50",
      72975, 72976, 72685, 72686, 72687, 72688, 72800, 72801, 72804, 72805, 72689, 72690, 72977, 72978,
      72717, 72718, 72705, 72706, "BP51", 72701, 72702, 61822, 86464,
    ),
  },
  { name: "cerebellum", file: "organs", group: "organs", system: "nervous", color: COLORS.cerebellum, fma: ids(67944), view: "back" },
  { name: "brainstem", file: "organs", group: "organs", system: "nervous", color: COLORS.brainstem, fma: ids(67943, 62004, "FMA61993nsn", 62394), view: "side" },
  { name: "hypothalamus", file: "organs", group: "organs", system: "nervous", alsoIn: ["endocrine"], color: COLORS.gland, fma: ids("FMA62008nsn"), view: "side" },
  { name: "pituitary", file: "organs", group: "organs", system: "endocrine", color: COLORS.gland, fma: ids(13889), view: "side" },
  { name: "eyeballs", file: "organs", group: "organs", system: "sensory", alsoIn: ["nervous"], color: COLORS.eye, fma: ids(12513, 50875, 50878) },
  { name: "lungs", file: "organs", group: "organs", system: "respiratory", color: COLORS.lungs, fma: ids(7333, 7337, 7383, 7370, 7371) },
  { name: "trachea", file: "organs", group: "organs", system: "respiratory", color: COLORS.airway, fma: ids(7394, 7409) },
  { name: "larynx", file: "organs", group: "organs", system: "respiratory", color: COLORS.cartilage, fma: ids(55099), view: "side" },
  { name: "diaphragm", file: "organs", group: "organs", system: "muscular", alsoIn: ["respiratory"], color: COLORS.diaphragm, fma: ids(13295) },
  { name: "stomach", file: "organs", group: "organs", system: "digestive", color: COLORS.stomach, fma: ids(7148) },
  { name: "esophagus", file: "organs", group: "organs", system: "digestive", color: COLORS.stomach, fma: ids(7131), view: "side" },
  { name: "liver", file: "organs", group: "organs", system: "digestive", color: COLORS.liver, fma: ids(7197, 7202) },
  { name: "small_intestine", file: "organs", group: "organs", system: "digestive", color: COLORS.intestines, fma: ids(7206, 7207, 7208) },
  {
    name: "large_intestine",
    file: "organs",
    group: "organs",
    system: "digestive",
    color: COLORS.colon,
    fma: ids("FMA14543nsn", 14544, 14542, 76891, 76892, 76893),
  },
  { name: "pancreas", file: "organs", group: "organs", system: "digestive", alsoIn: ["endocrine"], color: COLORS.pancreas, fma: ids("FMA7198nsn") },
  { name: "spleen", file: "organs", group: "organs", system: "immune", color: COLORS.spleen, fma: ids(7196), view: "side" },
  { name: "kidneys", file: "organs", group: "organs", system: "urinary", color: COLORS.kidney, fma: ids(7204, 7205), view: "back" },
  { name: "ureters", file: "organs", group: "organs", system: "urinary", color: COLORS.bladder, fma: ids(15571, 15572) },
  { name: "bladder", file: "organs", group: "organs", system: "urinary", color: COLORS.bladder, fma: ids(15900) },
  { name: "adrenal_glands", file: "organs", group: "organs", system: "endocrine", color: COLORS.gland, fma: ids(15629, 15630), view: "back" },
  { name: "thymus", file: "organs", group: "organs", system: "immune", alsoIn: ["endocrine"], color: COLORS.thymus, fma: ids(71194, 71195) },

  // Circulatory (rendered with the organs, or on their own in the circulatory view)
  { name: "heart", file: "circulatory", group: "organs", system: "circulatory", color: COLORS.heart, fma: ids(7274) },
  { name: "aorta", file: "circulatory", group: "organs", system: "circulatory", color: COLORS.artery, fma: ids(3736, 3768, 3784, "FMA3932nsn") },
  { name: "vena_cava", file: "circulatory", group: "organs", system: "circulatory", color: COLORS.vein, fma: ids(4720, 10951) },
  {
    name: "arteries",
    file: "circulatory",
    group: "organs",
    system: "circulatory",
    color: COLORS.artery,
    fma: ids(3941, 4058, 3953, 4694, 14765, 14766, 18806, 18807, 18809, 18810, 14752, 14753, 50737, 14749, 14750, 14771, 14768, 14773),
  },
  {
    name: "veins",
    file: "circulatory",
    group: "organs",
    system: "circulatory",
    color: COLORS.vein,
    fma: ids(4751, 4761, 4754, 4762, 4755, 4763, 21387, 21388, 18885, 18886, 18887, 18888, 14335, 14336, 14331, 14332, 4707, 4713, 4706, 71567, 76751),
  },
  { name: "pulmonary_artery", file: "circulatory", group: "organs", system: "circulatory", color: COLORS.vein, fma: ids(66326) },
  { name: "pulmonary_veins", file: "circulatory", group: "organs", system: "circulatory", color: COLORS.artery, fma: ids(66643) },
  {
    name: "coronary_arteries",
    file: "circulatory",
    group: "organs",
    system: "circulatory",
    color: COLORS.artery,
    fma: ids("FMA3862nsn", 3895, 3802, 3818, "FMA3840nsn", 76994, 4685, 71670, 71669),
  },
];

// ── Skin (split into regions by scripts/build-models.mjs) ────────────────
export const SKIN = {
  fma: "FMA7163",
  hair: ids(70751, 71098), // head hair, eyebrows
  /** Region nodes produced from the skin surface. */
  regions: ["skin_head", "skin_eyes", "skin_nose", "skin_mouth", "skin_ears", "skin_neck", "skin_chest", "skin_tummy", "skin_arms", "skin_hands", "skin_legs", "skin_feet", "skin_shorts"],  /** Skin regions that also belong to other system views (the sense organs). */
  alsoIn: {
    skin_eyes: ["sensory"],
    skin_ears: ["sensory"],
    skin_nose: ["sensory", "respiratory"],
    skin_mouth: ["sensory", "digestive"],
  },
};

/**
 * Schematic nervous-system pathways (BodyParts3D v3 has no spinal cord or
 * peripheral nerves). Built as tubes through bone landmarks; clearly a
 * simplified diagram, not dissection-accurate.
 *   point: [fmaId, fx, fy, fz] = position inside the landmark's bounding box
 *   (0 = min, 1 = max on each axis; x flipped per side for paired bones).
 */
export const NERVE_PATHS = {
  spinalCord: {
    radius: 0.0055,
    points: [
      ["FMA12519", 0.5, 0.6, 0.35],
      ["FMA12522", 0.5, 0.5, 0.35],
      ["FMA12525", 0.5, 0.5, 0.3],
      ["FMA9209", 0.5, 0.5, 0.3],
      ["FMA9968", 0.5, 0.5, 0.3],
      ["FMA10081", 0.5, 0.5, 0.3],
      ["FMA13073", 0.5, 0.7, 0.3],
    ],
  },
  // Paired nerves: built once per side (right: x as given, left: mirrored IDs).
  arm: {
    radius: 0.0028,
    points: [
      ["FMA12524", 0.5, 0.5, 0.3],
      ["FMA13322", 0.55, 0.3, 0.5],
      ["FMA23130", 0.7, 0.85, 0.45],
      ["FMA23130", 0.75, 0.15, 0.5],
      ["FMA23464", 0.5, 0.1, 0.5],
      ["FMA24446", 0.5, 0.3, 0.6],
    ],
    mirror: { FMA13322: "FMA13323", FMA23130: "FMA23131", FMA23464: "FMA23465", FMA24446: "FMA24447" },
  },
  leg: {
    radius: 0.0035,
    points: [
      ["FMA13075", 0.5, 0.5, 0.3],
      ["FMA16202", 0.3, 0.4, 0.4],
      ["FMA24474", 0.45, 0.9, 0.15],
      ["FMA24474", 0.5, 0.25, 0.1],
      ["FMA24477", 0.5, 0.15, 0.25],
      ["FMA24500", 0.5, 0.5, 0.5],
    ],
    mirror: { FMA24474: "FMA24475", FMA24477: "FMA24478", FMA24500: "FMA24501" },
  },};

/** Structures used only as landmarks for splitting the skin into regions. */
export const LANDMARKS = {
  head: [...SKULL, ...MANDIBLE],
  neck: [...CERVICAL, "FMA52749"],
  torso: [...RIBS, ...COSTAL_CARTILAGE, ...STERNUM, ...THORACIC, ...LUMBAR, ...CLAVICLES, ...SCAPULAE, ...PELVIS],
  arms: [...HUMERI, ...RADII, ...ULNAE],
  hands: HAND_BONES,
  legs: [...FEMURS, ...PATELLAE, ...TIBIAE, ...FIBULAE],
  feet: FOOT_BONES,
  eyeball: ids(12513),
  nose: ids(71704, 53647, 53648),
  lips: ["FMA59815nsn"],
  ear: ids(52780),
  xiphoid: ids(7488),
  hipBones: ids(16586, 16587),
};
