
namespace Emby.Naming.TV
{
    public class EpisodeInfo
    {
        /// <summary>
        /// Gets or sets the path.
        /// </summary>
        /// <value>The path.</value>
        public string Path { get; set; }
        /// <summary>
        /// Gets or sets the name of the series.
        /// </summary>
        /// <value>The name of the series.</value>
        public string SeriesName { get; set; }

        public int? SeasonNumber { get; set; }
        public int? EpisodeNumber { get; set; }
        public int? EndingEpisodeNumber { get; set; }

        public int? Year { get; set; }
        public int? Month { get; set; }
        public int? Day { get; set; }
        public bool IsByDate { get; set; }
    }
}
