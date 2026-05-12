using Frets.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Frets.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Song> Songs => Set<Song>();
    public DbSet<SongVersion> SongVersions => Set<SongVersion>();
    public DbSet<VersionChords> VersionChords => Set<VersionChords>();
    public DbSet<VersionTab> VersionTabs => Set<VersionTab>();
    public DbSet<SongVote> SongVotes => Set<SongVote>();
    public DbSet<Chord> Chords => Set<Chord>();
    public DbSet<VersionChordIndex> VersionChordIndex => Set<VersionChordIndex>();
    public DbSet<UserChordProgress> UserChordProgress => Set<UserChordProgress>();
    public DbSet<XpEvent> XpEvents => Set<XpEvent>();
    public DbSet<LevelThreshold> LevelThresholds => Set<LevelThreshold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.Username).IsUnique();
        });

        modelBuilder.Entity<Song>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Author)
                .WithMany(x => x.Songs)
                .HasForeignKey(x => x.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.StatusChangedByUser)
                .WithMany()
                .HasForeignKey(x => x.StatusChangedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SongVersion>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Song)
                .WithMany(x => x.Versions)
                .HasForeignKey(x => x.SongId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VersionChords>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.SongVersion)
                .WithOne(x => x.VersionChords)
                .HasForeignKey<VersionChords>(x => x.VersionId)
                .OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Content).HasColumnType("jsonb");
        });

        modelBuilder.Entity<VersionTab>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.SongVersion)
                .WithOne(x => x.VersionTab)
                .HasForeignKey<VersionTab>(x => x.VersionId)
                .OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Content).HasColumnType("jsonb");
        });

        modelBuilder.Entity<SongVote>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.SongId, x.UserId }).IsUnique();
            e.HasOne(x => x.Song)
                .WithMany(x => x.Votes)
                .HasForeignKey(x => x.SongId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User)
                .WithMany(x => x.SongVotes)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<VersionChordIndex>(e =>
        {
            e.HasKey(x => new { x.VersionId, x.ChordId });
            e.HasOne(x => x.SongVersion)
                .WithMany(x => x.ChordIndex)
                .HasForeignKey(x => x.VersionId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Chord)
                .WithMany(x => x.VersionChordIndex)
                .HasForeignKey(x => x.ChordId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UserChordProgress>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.ChordId }).IsUnique();
            e.HasOne(x => x.User)
                .WithMany(x => x.ChordProgress)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Chord)
                .WithMany(x => x.UserChordProgress)
                .HasForeignKey(x => x.ChordId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<XpEvent>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Meta).HasColumnType("jsonb");
            e.HasOne(x => x.User)
                .WithMany(x => x.XpEvents)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LevelThreshold>(e =>
        {
            e.HasKey(x => x.Level);
        });
    }
}