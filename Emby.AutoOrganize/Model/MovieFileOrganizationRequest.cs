using System.Collections.Generic;
using MediaBrowser.Model.Entities;

namespace Emby.AutoOrganize.Model
{
    public class MovieFileOrganizationRequest
    {
        public string ResultId { get; set; }
        
        public string MovieId { get; set; }

        public string NewMovieName { get; set; }

        public int? NewMovieYear { get; set; }

        public string NewMovieResolution { get; set; }

        public string TargetFolder { get; set; }

        public bool? RequestToOverwriteExistsingFile { get; set; }

        public ProviderIdDictionary NewMovieProviderIds { get; set; }
    }
}