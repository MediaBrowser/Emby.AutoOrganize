using Emby.Naming.Common;
using System;
using System.IO;
using System.Linq;

namespace Emby.Naming.TV
{
    public class EpisodeResolver
    {
        private readonly NamingOptions _options;

        public EpisodeResolver(NamingOptions options)
        {
            _options = options;
        }

        public EpisodeInfo Resolve(string path, bool IsDirectory, bool? isNamed = null, bool? isOptimistic = null, bool? supportsAbsoluteNumbers = null, bool fillExtendedInfo = true)
        {
            var parsingResult = new EpisodePathParser(_options)
                .Parse(path, IsDirectory, isNamed, isOptimistic, supportsAbsoluteNumbers, fillExtendedInfo);
            
            return new EpisodeInfo
            {
                Path = path,
                EndingEpisodeNumber = parsingResult.EndingEpsiodeNumber,
                EpisodeNumber = parsingResult.EpisodeNumber,
                SeasonNumber = parsingResult.SeasonNumber,
                SeriesName = parsingResult.SeriesName,
                IsByDate = parsingResult.IsByDate,
                Day = parsingResult.Day,
                Month = parsingResult.Month,
                Year = parsingResult.Year
            };
        }
    }
}
