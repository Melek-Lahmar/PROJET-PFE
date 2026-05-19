using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;

namespace Web_Api.Geo
{
    // ================================
    // 24 Gouvernorats de Tunisie
    // ================================
    public enum GouvernoratTunisie
    {
        Ariana,
        Beja,
        BenArous,
        Bizerte,
        Gabes,
        Gafsa,
        Jendouba,
        Kairouan,
        Kasserine,
        Kebili,
        Kef,
        Mahdia,
        Manouba,
        Medenine,
        Monastir,
        Nabeul,
        Sfax,
        SidiBouzid,
        Siliana,
        Sousse,
        Tataouine,
        Tozeur,
        Tunis,
        Zaghouan
    }

    public static class TunisieDecoupage
    {
        // Délégations triées A→Z, groupées par gouvernorat (01 → 24)
        private static readonly Dictionary<GouvernoratTunisie, List<string>> _delegations = new()
        {
            // 01) Ariana (7)
            { GouvernoratTunisie.Ariana, new List<string>
                {
                    "Ariana Ville",
                    "Ettadhamen",
                    "Kalâat el-Andalous",
                    "La Soukra",
                    "M'nihla",
                    "Raoued",
                    "Sidi Thabet",
                }
            },

            // 02) Béja (9)
            { GouvernoratTunisie.Beja, new List<string>
                {
                    "Amdoun",
                    "Béja Nord",
                    "Béja Sud",
                    "Goubellat",
                    "Medjez el-Bab",
                    "Nefza",
                    "Téboursouk",
                    "Testour",
                    "Thibar",
                }
            },

            // 03) Ben Arous (12)
            { GouvernoratTunisie.BenArous, new List<string>
                {
                    "Ben Arous",
                    "Bou Mhel el-Bassatine",
                    "El Mourouj",
                    "Ezzahra",
                    "Fouchana",
                    "Hammam Chott",
                    "Hammam Lif",
                    "Mégrine",
                    "Medina Jedida",
                    "Mohamedia",
                    "Mornag",
                    "Radès",
                }
            },

            // 04) Bizerte (14)  (alias Jarzouna/Zarzouna acceptés)
            { GouvernoratTunisie.Bizerte, new List<string>
                {
                    "Bizerte Nord",
                    "Bizerte Sud",
                    "El Alia",
                    "Ghar El Melh",
                    "Ghezala",
                    "Jarzouna",
                    "Joumine",
                    "Mateur",
                    "Menzel Bourguiba",
                    "Menzel Jemil",
                    "Ras Jebel",
                    "Sejnane",
                    "Tinja",
                    "Utique",
                    // Alias courant (certaines sources écrivent Zarzouna)
                    "Zarzouna",
                }
            },

            // 05) Gabès (13)
            { GouvernoratTunisie.Gabes, new List<string>
                {
                    "El Hamma",
                    "El Hamma Ouest",
                    "Gabès Médina",
                    "Gabès Ouest",
                    "Gabès Sud",
                    "Ghannouch",
                    "Mareth-Dkhila",
                    "Matmata",
                    "Métouia",
                    "Menzel El Habib",
                    "Nouvelle Matmata",
                    "Oudhref",
                    "Toujane",
                }
            },

            // 06) Gafsa (13)
            { GouvernoratTunisie.Gafsa, new List<string>
                {
                    "Belkhir",
                    "El Guettar",
                    "El Ksar",
                    "Gafsa Nord",
                    "Gafsa Sud",
                    "Mdhilla",
                    "Métlaoui",
                    "Moularès",
                    "Redeyef",
                    "Sened",
                    "Sidi Aïch",
                    "Sidi Boubaker",
                    "Zannouch",
                }
            },

            // 07) Jendouba (9)
            { GouvernoratTunisie.Jendouba, new List<string>
                {
                    "Aïn Draham",
                    "Balta-Bou Aouane",
                    "Bou Salem",
                    "Fernana",
                    "Ghardimaou",
                    "Jendouba",
                    "Jendouba Nord",
                    "Oued Meliz",
                    "Tabarka",
                }
            },

            // 08) Kairouan (13)
            { GouvernoratTunisie.Kairouan, new List<string>
                {
                    "Aïn Djeloula",
                    "Bou Hajla",
                    "Chebika",
                    "Echrarda",
                    "El Alâa",
                    "Haffouz",
                    "Hajeb El Ayoun",
                    "Kairouan Nord",
                    "Kairouan Sud",
                    "Menzel Mehiri",
                    "Nasrallah",
                    "Oueslatia",
                    "Sbikha",
                }
            },

            // 09) Kasserine (13)
            { GouvernoratTunisie.Kasserine, new List<string>
                {
                    "El Ayoun",
                    "Ezzouhour",
                    "Fériana",
                    "Foussana",
                    "Haïdra",
                    "Hassi El Ferid",
                    "Jedelienne",
                    "Kasserine Nord",
                    "Kasserine Sud",
                    "Majel Bel Abbès",
                    "Sbiba",
                    "Sbeïtla",
                    "Thala",
                }
            },

            // 10) Kébili (7)
            { GouvernoratTunisie.Kebili, new List<string>
                {
                    "Douz Nord",
                    "Douz Sud",
                    "Faouar",
                    "Kébili Nord",
                    "Kébili Sud",
                    "Rjim Maatoug",
                    "Souk Lahad",
                }
            },

            // 11) Le Kef (12)
            { GouvernoratTunisie.Kef, new List<string>
                {
                    "Dahmani",
                    "El Ksour",
                    "Jérissa",
                    "Kalâat Khasba",
                    "Kalaat Senan",
                    "Kef Est",
                    "Kef Ouest",
                    "Nebeur",
                    "Sakiet Sidi Youssef",
                    "Sers",
                    "Tajerouine",
                    "Touiref",
                }
            },

            // 12) Mahdia (13)
            { GouvernoratTunisie.Mahdia, new List<string>
                {
                    "Bou Merdes",
                    "Chebba",
                    "Chorbane",
                    "El Bradâa",
                    "El Jem",
                    "Essouassi",
                    "Hebira",
                    "Ksour Essef",
                    "Mahdia",
                    "Melloulèche",
                    "Ouled Chamekh",
                    "Rejiche",
                    "Sidi Alouane",
                }
            },

            // 13) La Manouba (8)
            { GouvernoratTunisie.Manouba, new List<string>
                {
                    "Borj El Amri",
                    "Djedeida",
                    "Douar Hicher",
                    "El Batan",
                    "La Manouba",
                    "Mornaguia",
                    "Oued Ellil",
                    "Tebourba",
                }
            },

            // 14) Médenine (9)
            { GouvernoratTunisie.Medenine, new List<string>
                {
                    "Ben Gardane",
                    "Beni Khedache",
                    "Djerba - Ajim",
                    "Djerba - Houmt Souk",
                    "Djerba - Midoun",
                    "Médenine Nord",
                    "Médenine Sud",
                    "Sidi Makhlouf",
                    "Zarzis",
                }
            },

            // 15) Monastir (13)
            { GouvernoratTunisie.Monastir, new List<string>
                {
                    "Bekalta",
                    "Bembla",
                    "Beni Hassen",
                    "Jemmal",
                    "Ksar Hellal",
                    "Ksibet el-Médiouni",
                    "Moknine",
                    "Monastir",
                    "Ouerdanine",
                    "Sahline",
                    "Sayada-Lamta-Bou Hajar",
                    "Téboulba",
                    "Zéramdine",
                }
            },

            // 16) Nabeul (16)  (Hammamet inclus, + Hammam Ghezèze)
            { GouvernoratTunisie.Nabeul, new List<string>
                {
                    "Béni Khalled",
                    "Béni Khiar",
                    "Bou Argoub",
                    "Dar Chaâbane El Fehri",
                    "El Haouaria",
                    "El Mida",
                    "Grombalia",
                    "Hammam Ghezèze",
                    "Hammamet",
                    "Kélibia",
                    "Korba",
                    "Menzel Bouzelfa",
                    "Menzel Temime",
                    "Nabeul",
                    "Soliman",
                    "Takelsa",
                }
            },

            // 17) Sfax (16)
            { GouvernoratTunisie.Sfax, new List<string>
                {
                    "Agareb",
                    "Bir Ali Ben Khalifa",
                    "El Amra",
                    "El Hencha",
                    "Graïba",
                    "Jebiniana",
                    "Kerkennah",
                    "Mahrès",
                    "Menzel Chaker",
                    "Sakiet Eddaïer",
                    "Sakiet Ezzit",
                    "Sfax Ouest",
                    "Sfax Sud",
                    "Sfax Ville",
                    "Skhira",
                    "Thyna",
                }
            },

            // 18) Sidi Bouzid (14)
            { GouvernoratTunisie.SidiBouzid, new List<string>
                {
                    "Bir El Hafey",
                    "Cebbala Ouled Asker",
                    "Essaïda",
                    "Hichria",
                    "Jilma",
                    "Meknassy",
                    "Menzel Bouzaiane",
                    "Mezzouna",
                    "Ouled Haffouz",
                    "Regueb",
                    "Sidi Ali Ben Aoun",
                    "Sidi Bouzid Est",
                    "Sidi Bouzid Ouest",
                    "Souk Jedid",
                }
            },

            // 19) Siliana (11)
            { GouvernoratTunisie.Siliana, new List<string>
                {
                    "Bargou",
                    "Bou Arada",
                    "El Aroussa",
                    "El Krib",
                    "Gaâfour",
                    "Kesra",
                    "Makthar",
                    "Rouhia",
                    "Sidi Bou Rouis",
                    "Siliana Nord",
                    "Siliana Sud",
                }
            },

            // 20) Sousse (16) (alias Enfidha/Enfida acceptés)
            { GouvernoratTunisie.Sousse, new List<string>
                {
                    "Akouda",
                    "Bouficha",
                    "Enfidha",
                    "Enfida", // alias
                    "Hammam Sousse",
                    "Hergla",
                    "Kalâa Kebira",
                    "Kalâa Seghira",
                    "Kondar",
                    "M'saken",
                    "Sidi Bou Ali",
                    "Sidi El Hani",
                    "Sousse Jawhara",
                    "Sousse Médina",
                    "Sousse Riadh",
                    "Sousse Sidi Abdelhamid",
                    "Zaouiet Ksibet Thrayet",
                }
            },

            // 21) Tataouine (8)
            { GouvernoratTunisie.Tataouine, new List<string>
                {
                    "Beni Mhira",
                    "Bir Lahmar",
                    "Dehiba",
                    "Ghomrassen",
                    "Remada",
                    "Smâr",
                    "Tataouine Nord",
                    "Tataouine Sud",
                }
            },

            // 22) Tozeur (6)
            { GouvernoratTunisie.Tozeur, new List<string>
                {
                    "Degache",
                    "El Hamma du Jérid",
                    "Hazoua",
                    "Nefta",
                    "Tameghza",
                    "Tozeur",
                }
            },

            // 23) Tunis (21)
            { GouvernoratTunisie.Tunis, new List<string>
                {
                    "Bab El Bhar",
                    "Bab Souika",
                    "Carthage",
                    "Cité El Khadra",
                    "Djebel Jelloud",
                    "El Kabaria",
                    "El Menzah",
                    "El Omrane",
                    "El Omrane supérieur",
                    "El Ouardia",
                    "Ettahrir",
                    "Ezzouhour",
                    "Hraïria",
                    "La Goulette",
                    "La Marsa",
                    "Le Bardo",
                    "Le Kram",
                    "Médina",
                    "Séjoumi",
                    "Sidi El Béchir",
                    "Sidi Hassine",
                }
            },

            // 24) Zaghouan (6)
            { GouvernoratTunisie.Zaghouan, new List<string>
                {
                    "Bir Mcherga",
                    "El Fahs",
                    "Nadhour",
                    "Saouaf",
                    "Zaghouan",
                    "Zriba",
                }
            },
        };

        public static IReadOnlyList<string> GetDelegations(GouvernoratTunisie gouvernorat)
            => _delegations.TryGetValue(gouvernorat, out var list)
                ? list
                : Array.Empty<string>();

        public static IReadOnlyDictionary<GouvernoratTunisie, List<string>> Delegations => _delegations;

        /// <summary>
        /// Vérifie si la délégation existe dans la liste du gouvernorat.
        /// Comparaison robuste: trim + casse + suppression accents + normalisation tirets/espaces.
        /// </summary>
        public static bool IsDelegationValide(GouvernoratTunisie gouvernorat, string? delegation)
        {
            if (string.IsNullOrWhiteSpace(delegation)) return false;

            var key = NormalizeKey(delegation);
            return GetDelegations(gouvernorat)
                .Select(NormalizeKey)
                .Any(x => x == key);
        }

        public static string? NormalizeDelegation(string? delegation)
            => string.IsNullOrWhiteSpace(delegation) ? null : delegation.Trim();

        private static string NormalizeKey(string value)
        {
            var s = value.Trim().ToLowerInvariant();

            // Unifier différents tirets
            s = s.Replace('–', '-')
                 .Replace('—', '-');

            // Apostrophes typographiques
            s = s.Replace('’', '\'');

            // Supprimer les accents
            s = RemoveDiacritics(s);

            // Garder lettres/chiffres, transformer espaces/tirets en espaces
            var sb = new StringBuilder(s.Length);
            foreach (var ch in s)
            {
                if (char.IsLetterOrDigit(ch)) sb.Append(ch);
                else if (ch == '-' || char.IsWhiteSpace(ch)) sb.Append(' ');
            }

            // Collapser espaces multiples
            return string.Join(' ', sb.ToString()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }

        private static string RemoveDiacritics(string text)
        {
            var normalized = text.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(normalized.Length);

            foreach (var c in normalized)
            {
                var uc = CharUnicodeInfo.GetUnicodeCategory(c);
                if (uc != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }

            return sb.ToString().Normalize(NormalizationForm.FormC);
        }
    }
}
