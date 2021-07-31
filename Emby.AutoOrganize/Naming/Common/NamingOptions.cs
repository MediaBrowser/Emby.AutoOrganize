using System.Collections.Generic;
using System;
using System.Linq;
using System.Text.RegularExpressions;

namespace Emby.Naming.Common
{
    public class NamingOptions
    {
        public string[] AudioFileExtensions { get; set; }
        public string[] AlbumStackingPrefixes { get; set; }

        public string[] SubtitleFileExtensions { get; set; }
        public char[] SubtitleFlagDelimiters { get; set; }

        public string[] SubtitleForcedFlags { get; set; }
        public string[] SubtitleDefaultFlags { get; set; }

        public EpisodeExpression[] EpisodeExpressions { get; set; }
        public string[] EpisodeWithoutSeasonExpressions { get; set; }
        public string[] EpisodeMultiPartExpressions { get; set; }

        public string[] VideoFileExtensions { get; set; }
        public string[] StubFileExtensions { get; set; }

        public char[] VideoFlagDelimiters { get; set; }

        public string[] VideoResolutionFlags { get; set; }

        public string[] VideoFileStackingExpressions { get; set; }
        public string[] CleanDateTimes { get; set; }
        public string[] CleanStrings { get; set; }


        public EpisodeExpression[] MultipleEpisodeExpressions { get; set; }

        public NamingOptions()
        {
            VideoFileExtensions = new string[]
            {
                ".m4v",
                ".3gp",
                ".nsv",
                ".ts",
                ".ty",
                ".strm",
                ".rm",
                ".rmvb",
                ".ifo",
                ".mov",
                ".qt",
                ".divx",
                ".xvid",
                ".bivx",
                ".vob",
                ".nrg",
                ".img",
                ".iso",
                ".pva",
                ".wmv",
                ".asf",
                ".asx",
                ".ogm",
                ".m2v",
                ".avi",
                ".bin",
                ".dvr-ms",
                ".mpg",
                ".mpeg",
                ".mp4",
                ".mkv",
                ".avc",
                ".vp3",
                ".svq3",
                ".nuv",
                ".viv",
                ".dv",
                ".fli",
                ".flv",
                ".001",
                ".tp"
            };

            VideoFlagDelimiters = new[]
            {
                '(',
                ')',
                '-',
                '.',
                '_',
                '[',
                ']'
            };

            VideoResolutionFlags = new[]
            {
                "480p",
                "720p",
                "1080p",
                "2160p", 
                "4K"
            };

            StubFileExtensions = new[]
            {
                ".disc"
            };

            VideoFileStackingExpressions = new[]
            {
                "(.*?)([ _.-]*(?:cd|dvd|p(?:ar)?t|dis[ck])[ _.-]*[0-9]+)(.*?)(\\.[^.]+)$",
                "(.*?)([ _.-]*(?:cd|dvd|p(?:ar)?t|dis[ck])[ _.-]*[a-d])(.*?)(\\.[^.]+)$",
                "(.*?)([ ._-]*[a-d])(.*?)(\\.[^.]+)$"
            };

            CleanDateTimes = new[]
            {
                @"(.+[^ _\,\.\(\)\[\]\-])[ _\.\(\)\[\]\-]+(19[0-9][0-9]|20[0-1][0-9])([ _\,\.\(\)\[\]\-][^0-9]|$)"
            };

            CleanStrings = new[]
            {
                @"[ _\,\.\(\)\[\]\-](ac3|dts|custom|dc|divx|divx5|dsr|dsrip|dutch|dvd|dvdrip|dvdscr|dvdscreener|screener|dvdivx|cam|fragment|fs|hdtv|hdrip|hdtvrip|internal|limited|multisubs|ntsc|ogg|ogm|pal|pdtv|proper|repack|rerip|retail|cd[1-9]|r3|r5|bd5|se|svcd|swedish|german|read.nfo|nfofix|unrated|ws|telesync|ts|telecine|tc|brrip|bdrip|480p|480i|576p|576i|720p|720i|1080p|1080i|2160p|4k|uhd|ultrahd|hdc|hdr|hrhd|hrhdtv|hddvd|bluray|x264|h264|xvid|xvidvd|xxx|www.www|\[.*\])([ _\,\.\(\)\[\]\-]|$)",
                @"[ _\,\.\(\)\[\]\-](3d|sbs|tab|hsbs|htab|mvc|\[.*\])([ _\,\.\(\)\[\]\-]|$)",
                @"(\[.*\])"
            };

            SubtitleFileExtensions = new[]
            {
                ".srt",
                ".ssa",
                ".ass",
                ".sub"
            };

            SubtitleFlagDelimiters = new[]
            {
                '.'
            };

            SubtitleForcedFlags = new[]
            {
                "foreign",
                "forced"
            };

            SubtitleDefaultFlags = new[]
            {
                "default"
            };

            AlbumStackingPrefixes = new[]
            {
                "disc",
                "cd",
                "disk",
                "vol",
                "volume"
            };

            AudioFileExtensions = new[]
            {
                ".nsv",
                ".m4a",
                ".flac",
                ".aac",
                ".strm",
                ".pls",
                ".rm",
                ".mpa",
                ".wav",
                ".wma",
                ".ogg",
                ".opus",
                ".mp3",
                ".mp2",
                ".mod",
                ".amf",
                ".669",
                ".dmf",
                ".dsm",
                ".far",
                ".gdm",
                ".imf",
                ".it",
                ".m15",
                ".med",
                ".okt",
                ".s3m",
                ".stm",
                ".sfx",
                ".ult",
                ".uni",
                ".xm",
                ".sid",
                ".ac3",
                ".dts",
                ".cue",
                ".aif",
                ".aiff",
                ".ape",
                ".mac",
                ".mpc",
                ".mp+",
                ".mpp",
                ".shn",
                ".wv",
                ".nsf",
                ".spc",
                ".gym",
                ".adplug",
                ".adx",
                ".dsp",
                ".adp",
                ".ymf",
                ".ast",
                ".afc",
                ".hps",
                ".xsp",
                ".acc",
                ".m4b",
                ".oga",
                ".dsf",
                ".mka"
            };

            EpisodeExpressions = new[]
            {
                // *** Begin Kodi Standard Naming
                // <!-- foo.s01.e01, foo.s01_e01, S01E02 foo, S01 - E02 -->
                new EpisodeExpression(@".*(\\|\/)(?<seriesname>((?![Ss]([0-9]+)[][ ._-]*[Ee]([0-9]+))[^\\\/])*)?[Ss](?<seasonnumber>[0-9]+)[][ ._-]*[Ee](?<epnumber>[0-9]+)([^\\/]*)$")
                {
                    IsNamed = true
                }, 
                // <!-- foo.ep01, foo.EP_01 -->
                new EpisodeExpression(@"[\._ -]()[Ee][Pp]_?([0-9]+)([^\\/]*)$"),
                new EpisodeExpression("([0-9]{4})[\\.-]([0-9]{2})[\\.-]([0-9]{2})", true)
                {
                    DateTimeFormats = new []
                    {
                        "yyyy.MM.dd",
                        "yyyy-MM-dd",
                        "yyyy_MM_dd"
                    }
                },
                new EpisodeExpression("([0-9]{2})[\\.-]([0-9]{2})[\\.-]([0-9]{4})", true)
                {
                    DateTimeFormats = new []
                    {
                        "dd.MM.yyyy",
                        "dd-MM-yyyy",
                        "dd_MM_yyyy"
                    }
                },

                new EpisodeExpression("[\\\\/\\._ \\[\\(-]([0-9]+)x([0-9]+(?:(?:[a-i]|\\.[1-9])(?![0-9]))?)([^\\\\/]*)$")
                {
                    SupportsAbsoluteEpisodeNumbers = true
                },
                new EpisodeExpression(@"[\\\\/\\._ -](?<seriesname>(?![0-9]+[0-9][0-9])([^\\\/])*)[\\\\/\\._ -](?<seasonnumber>[0-9]+)(?<epnumber>[0-9][0-9](?:(?:[a-i]|\\.[1-9])(?![0-9]))?)([\\._ -][^\\\\/]*)$")
                {
                    IsOptimistic = true,
                    IsNamed = true,
                    SupportsAbsoluteEpisodeNumbers = false
                },
                new EpisodeExpression("[\\/._ -]p(?:ar)?t[_. -]()([ivx]+|[0-9]+)([._ -][^\\/]*)$")
                {
                    SupportsAbsoluteEpisodeNumbers = true
                },

                // *** End Kodi Standard Naming

                new EpisodeExpression(@".*(\\|\/)[sS]?(?<seasonnumber>\d{1,4})[xX](?<epnumber>\d{1,3})[^\\\/]*$")
                {
                    IsNamed = true
                },

                new EpisodeExpression(@".*(\\|\/)[sS](?<seasonnumber>\d{1,4})[x,X]?[eE](?<epnumber>\d{1,3})[^\\\/]*$")
                {
                    IsNamed = true
                },

                new EpisodeExpression(@".*(\\|\/)(?<seriesname>((?![sS]?\d{1,4}[xX]\d{1,3})[^\\\/])*)?([sS]?(?<seasonnumber>\d{1,4})[xX](?<epnumber>\d{1,3}))[^\\\/]*$")
                {
                    IsNamed = true
                },

                new EpisodeExpression(@".*(\\|\/)(?<seriesname>[^\\\/]*)[sS](?<seasonnumber>\d{1,4})[xX\.]?[eE](?<epnumber>\d{1,3})[^\\\/]*$")
                {
                    IsNamed = true
                },

                // "01.avi"
                new EpisodeExpression(@".*[\\\/](?<epnumber>\d{1,3})(-(?<endingepnumber>\d{2,3}))*\.\w+$")
                {
                    IsOptimistic = true,
                    IsNamed = true
                },

                // "1-12 episode title"
                new EpisodeExpression(@"([0-9]+)-([0-9]+)")
                {
                },

                // "01 - blah.avi", "01-blah.avi"
                new EpisodeExpression(@".*(\\|\/)(?<epnumber>\d{1,3})(-(?<endingepnumber>\d{2,3}))*\s?-\s?[^\\\/]*$")
                {
                    IsOptimistic = true,
                    IsNamed = true
                },

                // "01.blah.avi"
                new EpisodeExpression(@".*(\\|\/)(?<epnumber>\d{1,3})(-(?<endingepnumber>\d{2,3}))*\.[^\\\/]+$")
                {
                    IsOptimistic = true,
                    IsNamed = true
                },

                // "blah - 01.avi", "blah 2 - 01.avi", "blah - 01 blah.avi", "blah 2 - 01 blah", "blah - 01 - blah.avi", "blah 2 - 01 - blah"
                new EpisodeExpression(@".*[\\\/][^\\\/]* - (?<epnumber>\d{1,3})(-(?<endingepnumber>\d{2,3}))*[^\\\/]*$")
                {
                    IsOptimistic = true,
                    IsNamed = true
                },

                // "01 episode title.avi"
                new EpisodeExpression(@"[Ss]eason[\._ ](?<seasonnumber>[0-9]+)[\\\/](?<epnumber>\d{1,3})([^\\\/]*)$")
                {
                    IsOptimistic = true,
                    IsNamed = true
                },
                // "Episode 16", "Episode 16 - Title"
                new EpisodeExpression(@".*[\\\/][^\\\/]* (?<epnumber>\d{1,3})(-(?<endingepnumber>\d{2,3}))*[^\\\/]*$")
                {
                    IsOptimistic = true,
                    IsNamed = true
                }
            };

            EpisodeWithoutSeasonExpressions = new[]
            {
                @"[/\._ \-]()([0-9]+)(-[0-9]+)?"
            };

            EpisodeMultiPartExpressions = new[]
            {
                @"^[-_ex]+([0-9]+(?:(?:[a-i]|\\.[1-9])(?![0-9]))?)"
            };

            var extensions = VideoFileExtensions.ToList();

            extensions.AddRange(new[]
            {
                ".mkv",
                ".m2t",
                ".m2ts",
                ".img",
                ".iso",
                ".mk3d",
                ".ts",
                ".rmvb",
                ".mov",
                ".avi",
                ".mpg",
                ".mpeg",
                ".wmv",
                ".mp4",
                ".divx",
                ".dvr-ms",
                ".wtv",
                ".ogm",
                ".ogv",
                ".asf",
                ".m4v",
                ".flv",
                ".f4v",
                ".3gp",
                ".webm",
                ".mts",
                ".m2v",
                ".rec",
                ".mxf"
            });

            MultipleEpisodeExpressions = new string[]
            {
                @".*(\\|\/)[sS]?(?<seasonnumber>\d{1,4})[xX](?<epnumber>\d{1,3})((-| - )\d{1,4}[eExX](?<endingepnumber>\d{1,3}))+[^\\\/]*$",
                @".*(\\|\/)[sS]?(?<seasonnumber>\d{1,4})[xX](?<epnumber>\d{1,3})((-| - )\d{1,4}[xX][eE](?<endingepnumber>\d{1,3}))+[^\\\/]*$",
                @".*(\\|\/)[sS]?(?<seasonnumber>\d{1,4})[xX](?<epnumber>\d{1,3})((-| - )?[xXeE](?<endingepnumber>\d{1,3}))+[^\\\/]*$",
                @".*(\\|\/)[sS]?(?<seasonnumber>\d{1,4})[xX](?<epnumber>\d{1,3})(-[xE]?[eE]?(?<endingepnumber>\d{1,3}))+[^\\\/]*$",
                @".*(\\|\/)(?<seriesname>((?![sS]?\d{1,4}[xX]\d{1,3})[^\\\/])*)?([sS]?(?<seasonnumber>\d{1,4})[xX](?<epnumber>\d{1,3}))((-| - )\d{1,4}[xXeE](?<endingepnumber>\d{1,3}))+[^\\\/]*$",
                @".*(\\|\/)(?<seriesname>((?![sS]?\d{1,4}[xX]\d{1,3})[^\\\/])*)?([sS]?(?<seasonnumber>\d{1,4})[xX](?<epnumber>\d{1,3}))((-| - )\d{1,4}[xX][eE](?<endingepnumber>\d{1,3}))+[^\\\/]*$",
                @".*(\\|\/)(?<seriesname>((?![sS]?\d{1,4}[xX]\d{1,3})[^\\\/])*)?([sS]?(?<seasonnumber>\d{1,4})[xX](?<epnumber>\d{1,3}))((-| - )?[xXeE](?<endingepnumber>\d{1,3}))+[^\\\/]*$",
                @".*(\\|\/)(?<seriesname>((?![sS]?\d{1,4}[xX]\d{1,3})[^\\\/])*)?([sS]?(?<seasonnumber>\d{1,4})[xX](?<epnumber>\d{1,3}))(-[xX]?[eE]?(?<endingepnumber>\d{1,3}))+[^\\\/]*$",
                @".*(\\|\/)(?<seriesname>[^\\\/]*)[sS](?<seasonnumber>\d{1,4})[xX\.]?[eE](?<epnumber>\d{1,3})((-| - )?[xXeE](?<endingepnumber>\d{1,3}))+[^\\\/]*$",
                @".*(\\|\/)(?<seriesname>[^\\\/]*)[sS](?<seasonnumber>\d{1,4})[xX\.]?[eE](?<epnumber>\d{1,3})(-[xX]?[eE]?(?<endingepnumber>\d{1,3}))+[^\\\/]*$"

            }.Select(i => new EpisodeExpression(i)
            {
                IsNamed = true

            }).ToArray();

            VideoFileExtensions = extensions
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            Compile();
        }

        public Regex[] VideoFileStackingRegexes { get; private set; }
        public Regex[] CleanDateTimeRegexes { get; private set; }
        public Regex[] CleanStringRegexes { get; private set; }

        public Regex[] EpisodeWithoutSeasonRegexes { get; private set; }
        public Regex[] EpisodeMultiPartRegexes { get; private set; }

        public void Compile()
        {
            VideoFileStackingRegexes = VideoFileStackingExpressions.Select(Compile).ToArray();
            CleanDateTimeRegexes = CleanDateTimes.Select(Compile).ToArray();
            CleanStringRegexes = CleanStrings.Select(Compile).ToArray();
            EpisodeWithoutSeasonRegexes = EpisodeWithoutSeasonExpressions.Select(Compile).ToArray();
            EpisodeMultiPartRegexes = EpisodeMultiPartExpressions.Select(Compile).ToArray();
        }

        private Regex Compile(string exp)
        {
            return new Regex(exp, RegexOptions.IgnoreCase | RegexOptions.Compiled);
        }
    }
}
