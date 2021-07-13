using System.Collections.Generic;
using MediaBrowser.Model.Entities;

namespace Emby.AutoOrganize.Model
{
    public class EpisodeFileOrganizationRequest
    {
        public string ResultId { get; set; }
        
        public string SeriesId { get; set; }

        public int SeasonNumber { get; set; }

        public int EpisodeNumber { get; set; }

        public int? EndingEpisodeNumber { get; set; }

        public bool RememberCorrection { get; set; }

        public string NewSeriesName { get; set; }

        public int? NewSeriesYear { get; set; }

        public string TargetFolder { get; set; }

        public ProviderIdDictionary NewSeriesProviderIds { get; set; }

        public bool? RequestToOverwriteExistsingFile {get; set;}
    }
}